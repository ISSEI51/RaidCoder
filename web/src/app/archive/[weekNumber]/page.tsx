import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  CircleCheck,
  ShieldAlert,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RankBadge } from "@/components/RankBadge";
import { UserLink } from "@/components/UserLink";
import { BossAvatar } from "@/components/BossAvatar";
import { characterForWeek } from "@/lib/characters";
import { sortByRank } from "@/lib/ranks";
import { formatDateTimeJst, formatInt } from "@/lib/format";

// 過去週の詳細: ボス結果 + 問題一覧(問題ページで解説が読める)+ 最終ランキング
export default async function ArchiveWeekPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>;
}) {
  const { weekNumber } = await params;
  const num = Number.parseInt(weekNumber, 10);
  if (!Number.isFinite(num)) notFound();

  const supabase = await createClient();

  const { data: week } = await supabase
    .from("raid_weeks")
    .select("*")
    .eq("week_number", num)
    .eq("status", "ended")
    .maybeSingle();
  if (!week) notFound();

  const [problemsRes, statsRes, leaderboardRes] = await Promise.all([
    supabase.from("problems").select("*").eq("week_id", week.id),
    supabase.rpc("get_problem_stats", { p_week_id: week.id }),
    supabase.rpc("get_week_leaderboard", { p_week_id: week.id }),
  ]);

  const problems = sortByRank(problemsRes.data ?? []);
  const statsMap = new Map((statsRes.data ?? []).map((s) => [s.problem_id, s]));
  const leaderboard = leaderboardRes.data ?? [];
  const defeated = week.defeated_at !== null || week.boss_hp <= 0;
  const character = characterForWeek(week.week_number);

  return (
    <div className="space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2.5 text-muted-foreground"
        >
          <Link href="/archive">
            <ArrowLeft className="size-4" aria-hidden />
            アーカイブに戻る
          </Link>
        </Button>
      </div>

      {/* ボス結果(独立した情報のかたまりなのでカード) */}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="text-xs font-bold tracking-widest text-muted-foreground tabular-nums">
          WEEK {week.week_number} — 討伐記録
        </div>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <BossAvatar character={character} size={80} defeated={defeated} />
          <div className="min-w-0 text-center sm:text-left">
            <h1 className="text-xl font-bold">{week.boss_name}</h1>
            {week.boss_flavor && (
              <p className="mt-1 text-sm italic text-muted-foreground">
                「{week.boss_flavor}」
              </p>
            )}
            <div className="mt-2 text-sm">
              {defeated ? (
                <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-bold text-primary sm:justify-start">
                  <Trophy className="size-4" aria-hidden />
                  撃破成功
                  {week.defeated_at && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatDateTimeJst(week.defeated_at)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 font-bold text-destructive tabular-nums">
                  <ShieldAlert className="size-4" aria-hidden />
                  討伐失敗 — 残りHP {formatInt(week.boss_hp)} /{" "}
                  {formatInt(week.boss_max_hp)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTimeJst(week.starts_at)} 〜{" "}
              {formatDateTimeJst(week.ends_at)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 問題一覧 */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Swords className="size-5 text-muted-foreground" aria-hidden />
            出題された問題
          </h2>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
            解説・公式解も公開中
          </p>
          <div className="divide-y divide-border rounded-lg border border-border">
            {problems.map((problem) => {
              const stats = statsMap.get(problem.id);
              return (
                <Link
                  key={problem.id}
                  href={`/problems/${problem.id}`}
                  className="flex items-center gap-3 px-3 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-secondary/50"
                >
                  <RankBadge rank={problem.rank} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {problem.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Swords className="size-3" aria-hidden />
                        {formatInt(problem.base_damage)}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <CircleCheck className="size-3" aria-hidden />
                        AC {formatInt(stats?.ac_user_count ?? 0)}人
                      </span>
                      {stats?.first_blood_handle && (
                        <span
                          className="inline-flex items-center gap-1"
                          title="最速AC"
                        >
                          <Zap className="size-3" aria-hidden />
                          {stats.first_blood_handle}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </section>

        {/* 最終ランキング */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Trophy className="size-5 text-muted-foreground" aria-hidden />
            最終ランキング
          </h2>
          {leaderboard.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              参加者はいませんでした
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table className="min-w-[360px]">
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead className="px-3 text-xs text-muted-foreground">
                      順位
                    </TableHead>
                    <TableHead className="px-3 text-xs text-muted-foreground">
                      ユーザー
                    </TableHead>
                    <TableHead className="px-3 text-right text-xs text-muted-foreground">
                      ダメージ
                    </TableHead>
                    <TableHead className="px-3 text-right text-xs text-muted-foreground">
                      AC数
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, i) => (
                    <TableRow key={entry.user_id}>
                      <TableCell
                        className={`px-3 tabular-nums ${
                          i < 3
                            ? "font-bold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </TableCell>
                      <TableCell className="px-3">
                        <UserLink handle={entry.handle} rating={entry.rating} />
                      </TableCell>
                      <TableCell className="px-3 text-right font-bold tabular-nums">
                        {formatInt(entry.total_damage)}
                      </TableCell>
                      <TableCell className="px-3 text-right text-muted-foreground tabular-nums">
                        {formatInt(entry.solved_count)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
