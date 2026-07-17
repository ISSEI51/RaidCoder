import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Tabs } from "@/components/Tabs";
import { UserLink } from "@/components/UserLink";
import { ratingColorName, ratingTextClass } from "@/lib/rating";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "ランキング",
};

// ランキング: 今週のダメージ / 総合レート
export default async function RankingPage() {
  const supabase = await createClient();

  const { data: week } = await supabase
    .from("raid_weeks")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  const [leaderboardRes, profilesRes] = await Promise.all([
    week
      ? supabase.rpc("get_week_leaderboard", { p_week_id: week.id })
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("profiles")
      .select("*")
      .order("rating", { ascending: false })
      .order("exp", { ascending: false })
      .limit(100),
  ]);

  const leaderboard = leaderboardRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const weeklyContent = (
    <div>
      {week ? (
        <p className="mb-3 text-xs text-slate-400">
          WEEK {week.week_number}「{week.boss_name}」への週間累計ダメージ
        </p>
      ) : (
        <p className="mb-3 text-xs text-slate-400">
          現在開催中のレイドはありません(ボス準備中)
        </p>
      )}
      {leaderboard.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
          まだ誰もダメージを与えていません
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-900/70 text-left text-xs text-slate-400">
                <th className="px-3 py-2">順位</th>
                <th className="px-3 py-2">ユーザー</th>
                <th className="px-3 py-2 text-right">週間ダメージ</th>
                <th className="px-3 py-2 text-right">AC数</th>
                <th className="px-3 py-2 text-right">レート</th>
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
                    <UserLink
                      handle={entry.handle}
                      rating={entry.rating}
                      avatarUrl={entry.avatar_url}
                      showAvatar
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-yellow-300">
                    💥{formatInt(entry.total_damage)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">
                    {formatInt(entry.solved_count)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono font-bold ${ratingTextClass(entry.rating)}`}
                  >
                    {entry.rating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const overallContent = (
    <div className="overflow-x-auto rounded-lg border border-slate-700/60">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-slate-700/60 bg-slate-900/70 text-left text-xs text-slate-400">
            <th className="px-3 py-2">順位</th>
            <th className="px-3 py-2">ユーザー</th>
            <th className="px-3 py-2 text-right">レート</th>
            <th className="px-3 py-2">色</th>
            <th className="px-3 py-2 text-right">EXP</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile, i) => (
            <tr
              key={profile.id}
              className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
            >
              <td className="px-3 py-2 font-mono">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </td>
              <td className="px-3 py-2">
                <UserLink
                  handle={profile.handle}
                  rating={profile.rating}
                  avatarUrl={profile.avatar_url}
                  showAvatar
                />
              </td>
              <td
                className={`px-3 py-2 text-right font-mono text-base font-black ${ratingTextClass(profile.rating)}`}
              >
                {profile.rating}
              </td>
              <td className={`px-3 py-2 text-xs font-bold ${ratingTextClass(profile.rating)}`}>
                {ratingColorName(profile.rating)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-slate-300">
                {formatInt(profile.exp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-slate-100">🏆 ランキング</h1>
      <Tabs
        items={[
          { key: "weekly", label: "💥 今週のダメージ", content: weeklyContent },
          { key: "overall", label: "📈 総合レート", content: overallContent },
        ]}
      />
    </div>
  );
}
