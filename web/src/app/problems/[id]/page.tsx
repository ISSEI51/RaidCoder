import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  Clock,
  Flame,
  History,
  MemoryStick,
  MessageSquare,
  MessagesSquare,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/Markdown";
import { RankBadge } from "@/components/RankBadge";
import { BossAvatar } from "@/components/BossAvatar";
import { SubmitPanel } from "@/components/SubmitPanel";
import { SubmissionList, type SubmissionListItem } from "@/components/SubmissionList";
import { Tabs } from "@/components/Tabs";
import { Separator } from "@/components/ui/separator";
import { NewThreadForm } from "@/components/board/NewThreadForm";
import { characterForWeek } from "@/lib/characters";
import { languageLabel } from "@/lib/languages";
import { formatDateTimeJst, formatInt } from "@/lib/format";

type OfficialSolution = { language: string; code: string };

// 問題ページ: 問題文 / サンプル / エディタ提出 / 提出履歴 / 解説 / 掲示板
export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: problem } = await supabase
    .from("problems")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!problem) notFound();

  const [weekRes, samplesRes, editorialRes, mineRes, othersRes, threadsRes] =
    await Promise.all([
      supabase.from("raid_weeks").select("*").eq("id", problem.week_id).maybeSingle(),
      supabase
        .from("test_cases")
        .select("*")
        .eq("problem_id", problem.id)
        .eq("is_sample", true)
        .order("name"),
      // RLS により週終了前は取得できない(=null)
      supabase
        .from("problem_editorials")
        .select("*")
        .eq("problem_id", problem.id)
        .maybeSingle(),
      supabase
        .from("submissions")
        .select("*")
        .eq("problem_id", problem.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      // RLS が返すものをそのまま表示(自分がAC済み or 週終了後のみ他人の提出が見える)
      supabase
        .from("submissions")
        .select("*")
        .eq("problem_id", problem.id)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("board_threads")
        .select("*")
        .eq("problem_id", problem.id)
        .order("created_at", { ascending: false }),
    ]);

  const week = weekRes.data;
  if (!week) notFound();
  const samples = samplesRes.data ?? [];
  const editorial = editorialRes.data;
  const mySubmissions = mineRes.data ?? [];
  const otherSubmissions = othersRes.data ?? [];
  const threads = threadsRes.data ?? [];
  const boss = characterForWeek(week.week_number);

  // 他人の提出のユーザー情報
  const otherUserIds = [...new Set(otherSubmissions.map((s) => s.user_id))];
  const { data: otherProfiles } = otherUserIds.length
    ? await supabase.from("profiles").select("*").in("id", otherUserIds)
    : { data: [] };
  const profileMap = new Map((otherProfiles ?? []).map((p) => [p.id, p]));

  const officialSolutions: OfficialSolution[] = Array.isArray(
    editorial?.official_solutions,
  )
    ? (editorial.official_solutions as unknown[]).filter(
        (s): s is OfficialSolution =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as OfficialSolution).language === "string" &&
          typeof (s as OfficialSolution).code === "string",
      )
    : [];

  const myItems: SubmissionListItem[] = mySubmissions.map((s) => ({
    id: s.id,
    status: s.status,
    language: s.language,
    created_at: s.created_at,
    damage: s.damage,
    is_first_blood: s.is_first_blood,
    exec_time_ms: s.exec_time_ms,
  }));

  const otherItems: SubmissionListItem[] = otherSubmissions.map((s) => ({
    id: s.id,
    status: s.status,
    language: s.language,
    created_at: s.created_at,
    damage: s.damage,
    is_first_blood: s.is_first_blood,
    exec_time_ms: s.exec_time_ms,
    handle: profileMap.get(s.user_id)?.handle ?? "???",
    rating: profileMap.get(s.user_id)?.rating ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href={week.status === "active" ? "/" : `/archive/${week.week_number}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-3" aria-hidden />
            <BossAvatar character={boss} size={20} />
            <span>
              WEEK <span className="tabular-nums">{week.week_number}</span>:{" "}
              {week.boss_name}
            </span>
          </Link>
          {week.status === "ended" && (
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              終了した週(練習モード・ダメージなし)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <RankBadge rank={problem.rank} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{problem.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3" aria-hidden />
                基礎ダメージ{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInt(problem.base_damage)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="size-3" aria-hidden />
                実行時間制限 {problem.time_limit_ms / 1000} sec
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MemoryStick className="size-3" aria-hidden />
                メモリ制限 {Math.floor(problem.memory_limit_kb / 1024)} MB
              </span>
            </div>
          </div>
        </div>
      </header>

      <Separator />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 問題文 + サンプル(可読性最優先: カードで囲わず本文をそのまま置く) */}
        <section className="min-w-0 space-y-6">
          <Markdown>{problem.statement_md}</Markdown>

          {samples.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">サンプルケース</h2>
              {samples.map((sample, i) => (
                <div
                  key={sample.id}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  <div className="flex items-baseline gap-2 border-b border-border bg-secondary px-3 py-1.5 text-xs font-medium">
                    サンプル {i + 1}
                    <span className="font-mono text-muted-foreground">
                      {sample.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 divide-y divide-border bg-card sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <div className="min-w-0">
                      <div className="px-3 pt-2 text-xs text-muted-foreground">
                        入力
                      </div>
                      <pre className="overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
                        {sample.input}
                      </pre>
                    </div>
                    <div className="min-w-0">
                      <div className="px-3 pt-2 text-xs text-muted-foreground">
                        期待出力
                      </div>
                      <pre className="overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
                        {sample.expected_output}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 提出パネル(このページの主要操作) */}
        <section className="min-w-0">
          <SubmitPanel
            problemId={problem.id}
            userId={user.id}
            weekStatus={week.status === "ended" ? "ended" : "active"}
          />
        </section>
      </div>

      {/* タブ: 提出履歴 / みんなの提出 / 解説 / 掲示板 */}
      <section>
        <Tabs
          items={[
            {
              key: "mine",
              label: (
                <span className="flex items-center gap-1.5">
                  <History className="size-4" aria-hidden />
                  自分の提出
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {myItems.length}
                  </span>
                </span>
              ),
              content: (
                <SubmissionList
                  items={myItems}
                  emptyMessage="まだ提出がありません。最初の一撃を放とう"
                />
              ),
            },
            {
              key: "others",
              label: (
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" aria-hidden />
                  みんなの提出
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {otherItems.length}
                  </span>
                </span>
              ),
              content: (
                <SubmissionList
                  items={otherItems}
                  emptyMessage="この問題をACすると他の人のコードが見られます(週終了後は全公開)"
                />
              ),
            },
            {
              key: "editorial",
              label: (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="size-4" aria-hidden />
                  解説
                </span>
              ),
              content: editorial ? (
                <div className="space-y-6">
                  <Markdown>{editorial.editorial_md}</Markdown>
                  {officialSolutions.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold">公式解</h3>
                      {officialSolutions.map((sol, i) => (
                        <div
                          key={i}
                          className="overflow-hidden rounded-lg border border-border"
                        >
                          <div className="border-b border-border bg-secondary px-3 py-1.5 text-xs font-medium">
                            {languageLabel(sol.language)}
                          </div>
                          <pre className="overflow-x-auto bg-card px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
                            {sol.code}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  <BookOpen className="mx-auto mb-2 size-5" aria-hidden />
                  解説と公式解は週終了後に公開されます
                  <p className="mt-1 text-xs">
                    (毎週月曜 00:00 JST の週替わりで解禁)
                  </p>
                </div>
              ),
            },
            {
              key: "board",
              label: (
                <span className="flex items-center gap-1.5">
                  <MessagesSquare className="size-4" aria-hidden />
                  掲示板
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {threads.length}
                  </span>
                </span>
              ),
              content: (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    アイデア相談は協力プレイの一部として歓迎。
                    <Link
                      href="/board"
                      className="ml-2 text-primary hover:underline"
                    >
                      掲示板全体を見る
                    </Link>
                  </p>
                  {threads.length > 0 ? (
                    <ul className="divide-y divide-border">
                      {threads.map((thread) => (
                        <li key={thread.id}>
                          <Link
                            href={`/board/${thread.id}`}
                            className="flex items-center gap-2.5 py-2.5 text-sm text-foreground transition-colors hover:text-primary"
                          >
                            <MessageSquare
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {thread.title}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {formatDateTimeJst(thread.created_at)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      この問題のスレッドはまだありません。
                    </p>
                  )}
                  <NewThreadForm
                    userId={user.id}
                    problemId={problem.id}
                    weekId={problem.week_id}
                  />
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
