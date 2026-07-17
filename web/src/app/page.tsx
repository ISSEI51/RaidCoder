import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BossPanel } from "@/components/BossPanel";
import { RankBadge } from "@/components/RankBadge";
import { UserLink } from "@/components/UserLink";
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
        <div className="boss-float text-8xl" aria-hidden>
          🥚
        </div>
        <h1 className="text-3xl font-black text-slate-200">ボス準備中…</h1>
        <p className="max-w-md text-sm text-slate-400">
          次のレイドボスは毎週月曜 00:00 (JST) に出現します。
          それまでに過去のレイドで腕を磨いておきましょう。
        </p>
        <Link
          href="/archive"
          className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-bold text-white hover:bg-purple-500"
        >
          📜 過去のレイドを見る
        </Link>
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
    <div className="space-y-6">
      <BossPanel week={week} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 問題一覧 */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-black tracking-widest text-purple-300">
            🗡️ 今週の討伐クエスト
          </h2>
          <div className="space-y-2">
            {problems.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
                問題を準備中です…
              </p>
            )}
            {problems.map((problem) => {
              const stats = statsMap.get(problem.id);
              return (
                <Link
                  key={problem.id}
                  href={`/problems/${problem.id}`}
                  className="flex items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 transition-all hover:border-purple-500/60 hover:bg-slate-800/60"
                >
                  <RankBadge rank={problem.rank} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-100">
                      {problem.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                      <span className="font-mono text-rose-300">
                        💥 基礎 {formatInt(problem.base_damage)}
                      </span>
                      <span>✅ AC {formatInt(stats?.ac_user_count ?? 0)}人</span>
                      <span>
                        🎯 挑戦 {formatInt(stats?.attempt_user_count ?? 0)}人
                      </span>
                      {stats?.first_blood_handle && (
                        <span className="text-amber-300">
                          ⚡ 先制: {stats.first_blood_handle}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-500">→</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* サイドバー: ランキング + ACフィード */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black tracking-widest text-purple-300">
                🏆 週間ランキング
              </h2>
              <Link href="/ranking" className="text-xs text-sky-400 hover:underline">
                すべて見る →
              </Link>
            </div>
            {leaderboard.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">
                まだ誰もダメージを与えていません。一番乗りのチャンス!
              </p>
            ) : (
              <ol className="space-y-1.5">
                {leaderboard.slice(0, 10).map((entry, i) => (
                  <li
                    key={entry.user_id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-7 text-center font-mono text-xs text-slate-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <UserLink handle={entry.handle} rating={entry.rating} />
                    </span>
                    <span className="font-mono text-xs font-bold text-yellow-300">
                      {formatInt(entry.total_damage)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-black tracking-widest text-purple-300">
              ⚡ 直近の攻撃ログ
            </h2>
            {activity.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">
                まだ攻撃記録がありません
              </p>
            ) : (
              <ul className="space-y-2">
                {activity.map((a) => (
                  <li key={a.submission_id} className="text-xs leading-relaxed">
                    <span className="font-bold text-slate-200">{a.handle}</span>
                    <span className="text-slate-400"> が </span>
                    <Link
                      href={`/problems/${a.problem_id}`}
                      className="text-sky-400 hover:underline"
                    >
                      [{a.problem_rank}] {a.problem_title}
                    </Link>
                    <span className="text-slate-400"> をAC! </span>
                    <span className="font-mono font-bold text-yellow-300">
                      -{formatInt(a.damage)}
                    </span>
                    {a.is_first_blood && (
                      <span className="ml-1 text-amber-300">⚡FB</span>
                    )}
                    <span className="ml-1 text-slate-600">
                      {timeAgo(a.judged_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
