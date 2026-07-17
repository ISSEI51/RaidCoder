-- ローカル開発用シード: チュートリアル週(AI生成なしで一通り遊べる)
-- 本番では generator が毎週これに相当するデータを生成する

insert into public.raid_weeks
  (id, week_number, starts_at, ends_at, boss_name, boss_flavor, boss_max_hp, boss_hp, status)
values (
  '11111111-1111-1111-1111-111111111111',
  1,
  -- CONTRACT §6: 週 = 月曜 00:00 JST 〜 翌月曜 00:00 JST
  -- (セッション TZ 依存の date_trunc('week', now()) だと UTC 基準になり 9 時間ずれる)
  date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo',
  (date_trunc('week', now() at time zone 'Asia/Tokyo') + interval '7 days') at time zone 'Asia/Tokyo',
  'チュートリアル・スライム',
  '最初の獲物。だが油断するな——奴のHPは6万ある。仲間と力を合わせて削り切れ!',
  60000,
  60000,
  'active'
);

-- ============ E: A+B ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage)
values (
  'aaaaaaaa-0000-0000-0000-00000000000e',
  '11111111-1111-1111-1111-111111111111',
  'E',
  'はじめての一撃',
  E'2 つの整数 $A$, $B$ が与えられます。$A + B$ を出力してください。\n\n## 制約\n\n- $-10^9 \\le A, B \\le 10^9$\n\n## 入力\n\n```\nA B\n```\n\n## 出力\n\n$A + B$ を1行で出力せよ。',
  2000, 262144, 500
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  ('aaaaaaaa-0000-0000-0000-00000000000e', 'sample_1', E'3 5\n', E'8\n', true),
  ('aaaaaaaa-0000-0000-0000-00000000000e', 'sample_2', E'-1000000000 1000000000\n', E'0\n', true),
  ('aaaaaaaa-0000-0000-0000-00000000000e', 'hidden_1', E'0 0\n', E'0\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000e', 'hidden_2', E'123456789 987654321\n', E'1111111110\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000e', 'hidden_3', E'-5 -7\n', E'-12\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000e', 'hidden_4', E'1 999999999\n', E'1000000000\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  'aaaaaaaa-0000-0000-0000-00000000000e',
  E'入力を読み取り、2 数の和を出力するだけです。オーバーフローは Python では気にする必要がありませんが、他言語では 64bit 整数を使いましょう。',
  '[{"language": "python", "code": "a, b = map(int, input().split())\nprint(a + b)"}]'::jsonb
);

-- ============ D: 偶数の総和 ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage)
values (
  'aaaaaaaa-0000-0000-0000-00000000000d',
  '11111111-1111-1111-1111-111111111111',
  'D',
  '偶数だけの晩餐',
  E'$N$ 個の整数 $a_1, \\ldots, a_N$ が与えられます。このうち**偶数**であるものの総和を出力してください。\n\n## 制約\n\n- $1 \\le N \\le 10^5$\n- $-10^9 \\le a_i \\le 10^9$\n\n## 入力\n\n```\nN\na_1 a_2 ... a_N\n```\n\n## 出力\n\n偶数の総和を1行で出力せよ。1つもない場合は $0$ を出力せよ。',
  2000, 262144, 1000
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  ('aaaaaaaa-0000-0000-0000-00000000000d', 'sample_1', E'5\n1 2 3 4 5\n', E'6\n', true),
  ('aaaaaaaa-0000-0000-0000-00000000000d', 'sample_2', E'3\n1 3 5\n', E'0\n', true),
  ('aaaaaaaa-0000-0000-0000-00000000000d', 'hidden_1', E'4\n2 4 6 8\n', E'20\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000d', 'hidden_2', E'1\n-2\n', E'-2\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000d', 'hidden_3', E'6\n0 1 -4 7 10 3\n', E'6\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000d', 'hidden_4', E'2\n1000000000 999999999\n', E'1000000000\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  'aaaaaaaa-0000-0000-0000-00000000000d',
  E'各要素について 2 で割った余りが 0 かどうかを判定し、偶数のみを合計します。負の数も `x % 2 == 0` で正しく判定できます(言語によっては剰余の符号に注意)。計算量は $O(N)$ です。',
  '[{"language": "python", "code": "n = int(input())\na = list(map(int, input().split()))\nprint(sum(x for x in a if x % 2 == 0))"}]'::jsonb
);

-- ============ C: 最大部分配列和 (Kadane) ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage)
values (
  'aaaaaaaa-0000-0000-0000-00000000000c',
  '11111111-1111-1111-1111-111111111111',
  'C',
  '連続コンボの極意',
  E'$N$ 個の整数 $a_1, \\ldots, a_N$ が与えられます。**空でない連続部分列**の総和として考えられる最大値を出力してください。\n\n## 制約\n\n- $1 \\le N \\le 2 \\times 10^5$\n- $-10^9 \\le a_i \\le 10^9$\n\n## 入力\n\n```\nN\na_1 a_2 ... a_N\n```\n\n## 出力\n\n最大の総和を1行で出力せよ。',
  2000, 262144, 2000
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'sample_1', E'5\n1 -2 3 4 -1\n', E'7\n', true),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'sample_2', E'3\n-5 -1 -3\n', E'-1\n', true),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'hidden_1', E'6\n2 -1 2 3 -9 4\n', E'6\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'hidden_2', E'1\n-100\n', E'-100\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'hidden_3', E'8\n-2 1 -3 4 -1 2 1 -5\n', E'6\n', false),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'hidden_4', E'4\n5 5 5 5\n', E'20\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  'aaaaaaaa-0000-0000-0000-00000000000c',
  E'Kadane 法を使います。$dp_i$ = 「$i$ 番目で終わる連続部分列の最大和」とすると $dp_i = \\max(a_i, dp_{i-1} + a_i)$ で、答えは $\\max_i dp_i$ です。全要素が負のケース(空列を選べない)に注意。計算量は $O(N)$ です。',
  '[{"language": "python", "code": "n = int(input())\na = list(map(int, input().split()))\nbest = cur = a[0]\nfor x in a[1:]:\n    cur = max(x, cur + x)\n    best = max(best, cur)\nprint(best)"}]'::jsonb
);
