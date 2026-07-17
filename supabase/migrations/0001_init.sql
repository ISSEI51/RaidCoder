-- RaidCoder 初期スキーマ
-- 取り決めの詳細は docs/CONTRACT.md を参照

create extension if not exists pgcrypto;

-- ============================================================
-- テーブル
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  avatar_url text,
  rating integer not null default 1000,
  exp bigint not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.raid_weeks (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  boss_name text not null,
  boss_flavor text not null default '',
  boss_max_hp bigint not null,
  boss_hp bigint not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'ended')),
  defeated_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (boss_hp >= 0 and boss_hp <= boss_max_hp)
);

create table public.problems (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.raid_weeks(id) on delete cascade,
  rank text not null check (rank in ('S', 'A', 'B', 'C', 'D', 'E')),
  title text not null,
  statement_md text not null,
  time_limit_ms integer not null default 2000,
  memory_limit_kb integer not null default 262144,
  base_damage integer not null,
  created_at timestamptz not null default now(),
  unique (week_id, rank)
);

create table public.problem_editorials (
  problem_id uuid primary key references public.problems(id) on delete cascade,
  editorial_md text not null,
  -- [{"language": "python", "code": "..."}]
  official_solutions jsonb not null default '[]'::jsonb
);

create table public.test_cases (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  name text not null,
  input text not null,
  expected_output text not null,
  is_sample boolean not null default false
);
create index test_cases_problem_idx on public.test_cases (problem_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  language text not null check (language in ('python', 'rust', 'typescript', 'java')),
  code text not null check (char_length(code) <= 65536),
  status text not null default 'pending' check (status in ('pending', 'running', 'AC', 'WA', 'TLE', 'RE', 'CE', 'IE')),
  passed_count integer not null default 0,
  total_count integer not null default 0,
  exec_time_ms integer,
  memory_kb integer,
  damage bigint not null default 0,
  is_first_blood boolean not null default false,
  created_at timestamptz not null default now(),
  -- claim_pending_submissions がクレームした時刻(stale running の回収判定に使う)
  claimed_at timestamptz,
  judged_at timestamptz
);
create index submissions_problem_user_idx on public.submissions (problem_id, user_id, status);
-- クレーム対象(pending と stale 回収対象の running)を走査するための部分インデックス
create index submissions_pending_idx on public.submissions (created_at) where status in ('pending', 'running');
create index submissions_user_idx on public.submissions (user_id, created_at desc);

create table public.board_threads (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid references public.problems(id) on delete cascade,
  week_id uuid references public.raid_weeks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index board_threads_problem_idx on public.board_threads (problem_id);

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.board_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body_md text not null check (char_length(body_md) between 1 and 20000),
  created_at timestamptz not null default now()
);
create index board_posts_thread_idx on public.board_posts (thread_id, created_at);

create table public.rating_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_id uuid not null references public.raid_weeks(id) on delete cascade,
  damage_total bigint not null,
  rank integer not null,
  performance integer not null,
  rating_before integer not null,
  rating_after integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_id)
);

-- ============================================================
-- プロフィール自動作成(GitHub ログイン時)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
begin
  base_handle := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    'user_' || substr(new.id::text, 1, 8)
  );
  begin
    insert into public.profiles (id, handle, avatar_url)
    values (new.id, base_handle, new.raw_user_meta_data ->> 'avatar_url');
  exception when unique_violation then
    insert into public.profiles (id, handle, avatar_url)
    values (new.id, base_handle || '_' || substr(new.id::text, 1, 4), new.raw_user_meta_data ->> 'avatar_url')
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ヘルパー(RLS の自己参照回避のため security definer)
-- ============================================================

create or replace function public.has_ac(p_problem_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.submissions
    where problem_id = p_problem_id and user_id = p_user_id and status = 'AC'
  );
$$;

create or replace function public.week_status_of_problem(p_problem_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select w.status
  from public.problems p
  join public.raid_weeks w on w.id = p.week_id
  where p.id = p_problem_id;
$$;

-- CONTRACT §7「anon には何も見えない」: security definer のため anon から叩けると
-- RLS を迂回して AC 有無・週ステータスを探針できる。PUBLIC への既定 EXECUTE
-- (+ Supabase の default privileges による anon への付与)を剥奪する。
-- RLS ポリシー式はクエリ実行ロール(authenticated)の権限で評価されるため、
-- authenticated への EXECUTE は必須(剥奪するとテーブル参照ごと壊れる)。
revoke execute on function public.has_ac(uuid, uuid) from public, anon;
revoke execute on function public.week_status_of_problem(uuid) from public, anon;
grant execute on function public.has_ac(uuid, uuid) to authenticated;
grant execute on function public.week_status_of_problem(uuid) to authenticated;

-- ============================================================
-- 権限(Grants)
-- Supabase の新しい既定では anon/authenticated に新規テーブルへの
-- 暗黙の権限が付かないため、必要な最小権限を明示的に付与する。
-- anon には一切付与しない(CONTRACT §7「anon には何も見えない」)。
-- 書き込みの列制限(profiles.update / submissions.insert)は
-- 後段の RLS セクションの column grant で付与する。
-- ============================================================

-- バックエンド(service role: judge-bridge / generator)は全操作可
grant all on all tables in schema public to service_role;

-- プレイヤー(authenticated): 読み取りは RLS が行を絞る前提で select を付与
grant select on
  public.profiles,
  public.raid_weeks,
  public.problems,
  public.problem_editorials,
  public.test_cases,
  public.submissions,
  public.rating_events
to authenticated;

-- 掲示板は作成・削除も可(行の所有チェックは RLS)
grant select, insert, delete on public.board_threads to authenticated;
grant select, insert, delete on public.board_posts to authenticated;
grant update (body_md) on public.board_posts to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.raid_weeks enable row level security;
alter table public.problems enable row level security;
alter table public.problem_editorials enable row level security;
alter table public.test_cases enable row level security;
alter table public.submissions enable row level security;
alter table public.board_threads enable row level security;
alter table public.board_posts enable row level security;
alter table public.rating_events enable row level security;

-- profiles: 全員閲覧可。自分の handle / avatar_url のみ変更可
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (handle, avatar_url) on public.profiles to authenticated;

-- raid_weeks: upcoming(来週のネタバレ)は隠す
create policy raid_weeks_select on public.raid_weeks
  for select to authenticated using (status in ('active', 'ended'));

-- problems: 週が active / ended なら閲覧可
create policy problems_select on public.problems
  for select to authenticated
  using (public.week_status_of_problem(id) in ('active', 'ended'));

-- 解説・公式解: 週が ended になったら公開(=「回答は1週間後」)
create policy editorials_select on public.problem_editorials
  for select to authenticated
  using (public.week_status_of_problem(problem_id) = 'ended');

-- テストケース: サンプルのみ公開。非サンプルは service role だけ
create policy test_cases_select_samples on public.test_cases
  for select to authenticated
  using (is_sample and public.week_status_of_problem(problem_id) in ('active', 'ended'));

-- submissions:
--   閲覧 = 自分の / 週終了後の全員の / 自分が AC 済みの問題の他人のもの
--   作成 = 自分名義・active か ended の週のみ(ended は練習提出、ダメージ0)
create policy submissions_select on public.submissions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.week_status_of_problem(problem_id) = 'ended'
    or public.has_ac(problem_id, auth.uid())
  );
create policy submissions_insert_own on public.submissions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.week_status_of_problem(problem_id) in ('active', 'ended')
  );
-- クライアントが書けるのはこの4列のみ(status/damage 等は default 値で入る)
revoke insert, update on public.submissions from authenticated;
grant insert (problem_id, user_id, language, code) on public.submissions to authenticated;

-- 掲示板: ログインユーザー全員が読み書き。編集・削除は自分の投稿のみ
create policy threads_select on public.board_threads
  for select to authenticated using (true);
create policy threads_insert on public.board_threads
  for insert to authenticated with check (author_id = auth.uid());
create policy threads_delete_own on public.board_threads
  for delete to authenticated using (author_id = auth.uid());
create policy posts_select on public.board_posts
  for select to authenticated using (true);
create policy posts_insert on public.board_posts
  for insert to authenticated with check (author_id = auth.uid());
create policy posts_update_own on public.board_posts
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete_own on public.board_posts
  for delete to authenticated using (author_id = auth.uid());

-- rating_events: 全員閲覧可(レートグラフ用)
create policy rating_events_select on public.rating_events
  for select to authenticated using (true);

-- ============================================================
-- クライアント向け集計関数(RLS を跨いでコード以外の集計を見せる)
-- ============================================================

create or replace function public.get_week_leaderboard(p_week_id uuid)
returns table (
  user_id uuid,
  handle text,
  avatar_url text,
  rating integer,
  total_damage bigint,
  solved_count bigint,
  last_ac_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.user_id,
    pr.handle,
    pr.avatar_url,
    pr.rating,
    sum(s.damage)::bigint as total_damage,
    count(*) filter (where s.damage > 0) as solved_count,
    max(s.judged_at) as last_ac_at
  from public.submissions s
  join public.problems p on p.id = s.problem_id
  join public.profiles pr on pr.id = s.user_id
  where p.week_id = p_week_id and s.status = 'AC'
  group by s.user_id, pr.handle, pr.avatar_url, pr.rating
  order by total_damage desc, last_ac_at asc;
$$;

create or replace function public.get_problem_stats(p_week_id uuid)
returns table (
  problem_id uuid,
  ac_user_count bigint,
  attempt_user_count bigint,
  first_blood_handle text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as problem_id,
    count(distinct s.user_id) filter (where s.status = 'AC') as ac_user_count,
    count(distinct s.user_id) as attempt_user_count,
    (
      select pr.handle
      from public.submissions fb
      join public.profiles pr on pr.id = fb.user_id
      where fb.problem_id = p.id and fb.is_first_blood
      order by fb.judged_at asc
      limit 1
    ) as first_blood_handle
  from public.problems p
  left join public.submissions s on s.problem_id = p.id
  where p.week_id = p_week_id
  group by p.id;
$$;

create or replace function public.get_recent_activity(p_week_id uuid, p_limit integer default 20)
returns table (
  submission_id uuid,
  handle text,
  avatar_url text,
  problem_id uuid,
  problem_rank text,
  problem_title text,
  damage bigint,
  is_first_blood boolean,
  judged_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id as submission_id,
    pr.handle,
    pr.avatar_url,
    p.id as problem_id,
    p.rank as problem_rank,
    p.title as problem_title,
    s.damage,
    s.is_first_blood,
    s.judged_at
  from public.submissions s
  join public.problems p on p.id = s.problem_id
  join public.profiles pr on pr.id = s.user_id
  where p.week_id = p_week_id and s.status = 'AC' and s.damage > 0
  order by s.judged_at desc
  limit least(p_limit, 100);
$$;

grant execute on function public.get_week_leaderboard(uuid) to authenticated;
grant execute on function public.get_problem_stats(uuid) to authenticated;
grant execute on function public.get_recent_activity(uuid, integer) to authenticated;

-- CONTRACT §7: サイト全体がログイン必須。anon(未ログイン)からは集計 RPC も実行不可。
-- (関数作成時に PUBLIC へ付く既定 EXECUTE と Supabase default privileges の anon 付与を剥奪)
revoke execute on function public.get_week_leaderboard(uuid) from public, anon;
revoke execute on function public.get_problem_stats(uuid) from public, anon;
revoke execute on function public.get_recent_activity(uuid, integer) from public, anon;

-- ============================================================
-- service role 専用関数(judge-bridge / generator)
-- ============================================================

-- pending を原子的にクレームして running へ。
-- あわせて、judge-bridge のクラッシュ/強制終了で running のまま孤児化した提出
-- (クレームから5分以上経過した stale 提出)も再クレームして回収する。
-- 万一処理中の提出を再クレームしても、apply_submission_result の
-- 「already judged」ガードにより結果の二重反映はされない。
create or replace function public.claim_pending_submissions(p_limit integer default 5)
returns setof public.submissions
language sql
security definer
set search_path = public
as $$
  update public.submissions s
  set status = 'running', claimed_at = now()
  where s.id in (
    select id from public.submissions
    where status = 'pending'
       or (status = 'running' and coalesce(claimed_at, created_at) < now() - interval '5 minutes')
    order by created_at
    limit p_limit
    for update skip locked
  )
  returning s.*;
$$;

-- 判定確定: ダメージ計算・ボスHP・EXP まで原子的に反映
-- ダメージ式は docs/CONTRACT.md §3(実装はこの関数が唯一)
create or replace function public.apply_submission_result(
  p_submission_id uuid,
  p_status text,
  p_passed_count integer,
  p_total_count integer,
  p_exec_time_ms integer,
  p_memory_kb integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sub public.submissions%rowtype;
  prob public.problems%rowtype;
  week public.raid_weeks%rowtype;
  v_damage bigint := 0;
  v_first_blood boolean := false;
  v_elapsed numeric;
  v_speed numeric;
begin
  if p_status not in ('AC', 'WA', 'TLE', 'RE', 'CE', 'IE') then
    raise exception 'invalid status: %', p_status;
  end if;

  select * into sub from public.submissions where id = p_submission_id for update;
  if not found then
    raise exception 'submission not found: %', p_submission_id;
  end if;
  if sub.status not in ('pending', 'running') then
    return jsonb_build_object('applied', false, 'reason', 'already judged');
  end if;

  select * into prob from public.problems where id = sub.problem_id;
  select * into week from public.raid_weeks where id = prob.week_id for update;

  -- 撃破後(boss_hp=0 / defeated_at 記録済み)でも週が active な間の初 AC は
  -- 満額計上する(CONTRACT §3 オーバーキル仕様)。defeated_at はここでは見ない。
  if p_status = 'AC'
     and week.status = 'active'
     and sub.created_at < week.ends_at
     and not public.has_ac(sub.problem_id, sub.user_id) then
    v_first_blood := not exists (
      select 1 from public.submissions
      where problem_id = sub.problem_id and status = 'AC' and id <> sub.id
    );
    v_elapsed := extract(epoch from (sub.created_at - week.starts_at))
               / nullif(extract(epoch from (week.ends_at - week.starts_at)), 0);
    v_elapsed := least(greatest(coalesce(v_elapsed, 1), 0), 1);
    v_speed := 1 + 0.3 * (1 - v_elapsed);
    v_damage := floor(prob.base_damage * v_speed * (case when v_first_blood then 1.5 else 1.0 end));
  end if;

  update public.submissions set
    status = p_status,
    passed_count = coalesce(p_passed_count, 0),
    total_count = coalesce(p_total_count, 0),
    exec_time_ms = p_exec_time_ms,
    memory_kb = p_memory_kb,
    damage = v_damage,
    is_first_blood = v_first_blood,
    judged_at = now()
  where id = p_submission_id;

  if v_damage > 0 then
    update public.raid_weeks set
      boss_hp = greatest(boss_hp - v_damage, 0),
      defeated_at = case
        when boss_hp - v_damage <= 0 and defeated_at is null then now()
        else defeated_at
      end
    where id = week.id;
    update public.profiles set exp = exp + v_damage where id = sub.user_id;
  end if;

  return jsonb_build_object(
    'applied', true,
    'status', p_status,
    'damage', v_damage,
    'first_blood', v_first_blood
  );
end;
$$;

-- 週の終了: 順位確定 → perf → レート更新 → 撃破ボーナス
-- レート式は docs/CONTRACT.md §5(実装はこの関数が唯一)
create or replace function public.finalize_week(p_week_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  week public.raid_weeks%rowtype;
  n integer;
  rec record;
  v_perf integer;
  v_new_rating integer;
  v_defeated boolean;
begin
  select * into week from public.raid_weeks where id = p_week_id for update;
  if not found then
    raise exception 'week not found: %', p_week_id;
  end if;
  if week.status <> 'active' then
    return jsonb_build_object('finalized', false, 'reason', 'week is not active');
  end if;

  update public.raid_weeks set status = 'ended' where id = p_week_id;
  v_defeated := week.defeated_at is not null or week.boss_hp <= 0;

  create temp table _standings on commit drop as
  select
    s.user_id,
    sum(s.damage)::bigint as total_damage,
    rank() over (order by sum(s.damage) desc) as rnk
  from public.submissions s
  join public.problems p on p.id = s.problem_id
  where p.week_id = p_week_id and s.status = 'AC' and s.damage > 0
  group by s.user_id;

  select count(*) into n from _standings;

  for rec in
    select st.user_id, st.total_damage, st.rnk, pr.rating
    from _standings st
    join public.profiles pr on pr.id = st.user_id
  loop
    v_perf := round(1200 + 800.0 * (n - rec.rnk) / greatest(n - 1, 1));
    v_new_rating := rec.rating + round((v_perf - rec.rating) / 4.0);
    insert into public.rating_events
      (user_id, week_id, damage_total, rank, performance, rating_before, rating_after)
    values
      (rec.user_id, p_week_id, rec.total_damage, rec.rnk, v_perf, rec.rating, v_new_rating)
    on conflict (user_id, week_id) do nothing;
    update public.profiles set rating = v_new_rating where id = rec.user_id;
    if v_defeated then
      update public.profiles set exp = exp + 2000 where id = rec.user_id;
    end if;
  end loop;

  return jsonb_build_object('finalized', true, 'participants', n, 'defeated', v_defeated);
end;
$$;

create or replace function public.activate_week(p_week_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.raid_weeks set status = 'active'
  where id = p_week_id and status = 'upcoming';
  get diagnostics v_count = row_count;
  return jsonb_build_object('activated', v_count = 1);
end;
$$;

-- ボスHP算出用: 直近14日にアクティブなプレイヤー数(最低3)
create or replace function public.count_active_players()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select greatest(coalesce(count(distinct user_id), 0), 3)::integer
  from public.submissions
  where created_at > now() - interval '14 days';
$$;

-- service role 専用: 他ロールからの execute を剥奪
revoke execute on function public.claim_pending_submissions(integer) from public, anon, authenticated;
revoke execute on function public.apply_submission_result(uuid, text, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.finalize_week(uuid) from public, anon, authenticated;
revoke execute on function public.activate_week(uuid) from public, anon, authenticated;
revoke execute on function public.count_active_players() from public, anon, authenticated;
grant execute on function public.claim_pending_submissions(integer) to service_role;
grant execute on function public.apply_submission_result(uuid, text, integer, integer, integer, integer) to service_role;
grant execute on function public.finalize_week(uuid) to service_role;
grant execute on function public.activate_week(uuid) to service_role;
grant execute on function public.count_active_players() to service_role;

-- ============================================================
-- 集計ビュー(クライアントが行を取得して数えると PostgREST の
-- max_rows=1000 で静かに打ち切られるため、集計済みの値を
-- security_invoker で公開する。RLS は基底テーブルのものが適用される)
-- ============================================================

create view public.week_participant_counts
with (security_invoker = true) as
select week_id, count(*)::bigint as participant_count
from public.rating_events
group by week_id;

create view public.board_thread_post_counts
with (security_invoker = true) as
select thread_id, count(*)::bigint as post_count
from public.board_posts
group by thread_id;

-- ビューはテーブル一括 grant より後に作られるため個別に付与
grant select on public.week_participant_counts, public.board_thread_post_counts to authenticated, service_role;

-- ============================================================
-- Realtime(ボスHP・提出結果のライブ更新)
-- ============================================================

do $$
begin
  alter publication supabase_realtime add table public.raid_weeks;
  alter publication supabase_realtime add table public.submissions;
exception
  when undefined_object then
    raise notice 'supabase_realtime publication not found (plain PostgreSQL?) — skipping';
  when duplicate_object then
    null;
end;
$$;
