import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RankBadge } from "@/components/RankBadge";
import { UserLink } from "@/components/UserLink";
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/archive" className="text-xs text-sky-400 hover:underline">
          ← アーカイブに戻る
        </Link>
      </div>

      {/* ボス結果 */}
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <div className="text-xs font-bold tracking-widest text-purple-300/80">
          WEEK {week.week_number} — 討伐記録
        </div>
        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
          <span className={`text-6xl ${defeated ? "opacity-50 grayscale" : ""}`}>
            {defeated ? "☠️" : "🐉"}
          </span>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-black text-slate-50">{week.boss_name}</h1>
            {week.boss_flavor && (
              <p className="mt-1 text-sm italic text-slate-400">「{week.boss_flavor}」</p>
            )}
            <div className="mt-2 text-sm">
              {defeated ? (
                <span className="font-black text-yellow-300 victory-glow">
                  🎉 撃破成功!
                  {week.defeated_at && (
                    <span className="ml-2 text-xs font-normal text-yellow-200/70">
                      {formatDateTimeJst(week.defeated_at)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="font-black text-rose-400">
                  😱 討伐失敗… 残りHP {formatInt(week.boss_hp)} /{" "}
                  {formatInt(week.boss_max_hp)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {formatDateTimeJst(week.starts_at)} 〜 {formatDateTimeJst(week.ends_at)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 問題一覧 */}
        <section>
          <h2 className="mb-3 text-sm font-black tracking-widest text-purple-300">
            🗡️ 出題された問題(解説・公式解も公開中)
          </h2>
          <div className="space-y-2">
            {problems.map((problem) => {
              const stats = statsMap.get(problem.id);
              return (
                <Link
                  key={problem.id}
                  href={`/problems/${problem.id}`}
                  className="flex items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 transition-all hover:border-purple-500/60"
                >
                  <RankBadge rank={problem.rank} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-100">
                      {problem.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                      <span className="font-mono text-rose-300">
                        💥 {formatInt(problem.base_damage)}
                      </span>
                      <span>✅ AC {formatInt(stats?.ac_user_count ?? 0)}人</span>
                      {stats?.first_blood_handle && (
                        <span className="text-amber-300">
                          ⚡ {stats.first_blood_handle}
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

        {/* 最終ランキング */}
        <section>
          <h2 className="mb-3 text-sm font-black tracking-widest text-purple-300">
            🏆 最終ランキング
          </h2>
          {leaderboard.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
              参加者はいませんでした
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700/60">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 bg-slate-900/70 text-left text-xs text-slate-400">
                    <th className="px-3 py-2">順位</th>
                    <th className="px-3 py-2">ユーザー</th>
                    <th className="px-3 py-2 text-right">ダメージ</th>
                    <th className="px-3 py-2 text-right">AC数</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={entry.user_id}
                      className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                    >
                      <td className="px-3 py-2 font-mono">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </td>
                      <td className="px-3 py-2">
                        <UserLink handle={entry.handle} rating={entry.rating} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-yellow-300">
                        💥{formatInt(entry.total_damage)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">
                        {formatInt(entry.solved_count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
