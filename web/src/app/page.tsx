import Link from "next/link";
import {
  Activity,
  Archive,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Sword,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BossPanel } from "@/components/BossPanel";
import { RankBadge } from "@/components/RankBadge";
import { UserLink } from "@/components/UserLink";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { sortByRank } from "@/lib/ranks";
import { formatInt, timeAgo } from "@/lib/format";

// レイドダッシュボード
export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: week } = await supabase
    .from("raid_weeks")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  // active 週が無い場合は「ボス準備中」
  if (!week) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <CalendarClock className="size-12 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-bold">ボス準備中…</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          次のレイドボスは毎週月曜 00:00 (JST) に出現します。
          それまでに過去のレイドで腕を磨いておきましょう。
        </p>
        <Button asChild>
          <Link href="/archive">
            <Archive aria-hidden />
            過去のレイドを見る
          </Link>
        </Button>
      </div>
    );
  }

  const [problemsRes, statsRes, leaderboardRes, activityRes] =
    await Promise.all([
      supabase.from("problems").select("*").eq("week_id", week.id),
      supabase.rpc("get_problem_stats", { p_week_id: week.id }),
      supabase.rpc("get_week_leaderboard", { p_week_id: week.id }),
      supabase.rpc("get_recent_activity", { p_week_id: week.id, p_limit: 15 }),
    ]);

  const problems = sortByRank(problemsRes.data ?? []);
  const statsMap = new Map(
    (statsRes.data ?? []).map((s) => [s.problem_id, s]),
  );
  const leaderboard = leaderboardRes.data ?? [];
  const activity = activityRes.data ?? [];

  return (
    <div className="space-y-5">
      <BossPanel week={week} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 問題一覧 */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Swords className="size-5 text-muted-foreground" aria-hidden />
              今週の討伐クエスト
            </h2>
            {problems.length > 0 && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {problems.length} 問
              </span>
            )}
          </div>
          {problems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              問題を準備中です…
            </p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {problems.map((problem) => {
                const stats = statsMap.get(problem.id);
                return (
                  <Link
                    key={problem.id}
                    href={`/problems/${problem.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
                  >
                    <RankBadge rank={problem.rank} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">
                        {problem.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Sword className="size-3" aria-hidden />
                          基礎 {formatInt(problem.base_damage)}
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <CircleCheck className="size-3" aria-hidden />
                          AC {formatInt(stats?.ac_user_count ?? 0)}人
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Target className="size-3" aria-hidden />
                          挑戦 {formatInt(stats?.attempt_user_count ?? 0)}人
                        </span>
                        {stats?.first_blood_handle && (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Zap className="size-3" aria-hidden />
                            先制 {stats.first_blood_handle}
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
          )}
        </section>

        {/* サイドバー: ランキング + ACフィード */}
        <div className="space-y-5">
          <Card size="sm" className="gap-3 rounded-lg">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Trophy className="size-4 text-muted-foreground" aria-hidden />
                週間ランキング
              </h2>
              <CardAction>
                <Link
                  href="/ranking"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  すべて見る
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  まだ誰もダメージを与えていません。一番乗りのチャンス!
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {leaderboard.slice(0, 10).map((entry, i) => (
                    <li
                      key={entry.user_id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className={`w-6 shrink-0 text-right font-mono text-xs tabular-nums ${
                          i < 3
                            ? "font-bold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <UserLink handle={entry.handle} rating={entry.rating} />
                      </span>
                      <span className="font-mono text-xs font-bold tabular-nums">
                        {formatInt(entry.total_damage)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card size="sm" className="gap-3 rounded-lg">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Activity className="size-4 text-muted-foreground" aria-hidden />
                直近の攻撃ログ
              </h2>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  まだ攻撃記録がありません
                </p>
              ) : (
                <ul className="space-y-2">
                  {activity.map((a) => (
                    <li key={a.submission_id} className="text-xs leading-relaxed">
                      <span className="font-bold text-foreground">
                        {a.handle}
                      </span>
                      <span className="text-muted-foreground"> が </span>
                      <Link
                        href={`/problems/${a.problem_id}`}
                        className="text-primary hover:underline"
                      >
                        [{a.problem_rank}] {a.problem_title}
                      </Link>
                      <span className="text-muted-foreground"> をAC </span>
                      <span className="font-mono font-bold tabular-nums text-foreground">
                        -{formatInt(a.damage)}
                      </span>
                      {a.is_first_blood && (
                        <span className="ml-1 inline-flex items-center gap-0.5 align-text-bottom font-bold text-primary">
                          <Zap className="size-3" aria-hidden />
                          FB
                        </span>
                      )}
                      <span className="ml-1 text-muted-foreground/70">
                        {timeAgo(a.judged_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
