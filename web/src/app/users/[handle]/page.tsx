import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RatingChart } from "@/components/RatingChart";
import { SubmissionList, type SubmissionListItem } from "@/components/SubmissionList";
import { ratingColorName, ratingTextClass } from "@/lib/rating";
import { formatDateJst, formatInt } from "@/lib/format";

// プロフィールページ: レート・色・EXP・参加週数・レート推移・直近の提出
export default async function UserPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", decodeURIComponent(handle))
    .maybeSingle();
  if (!profile) notFound();

  const [eventsRes, submissionsRes] = await Promise.all([
    supabase
      .from("rating_events")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true }),
    // RLS の範囲で見える提出のみ(他人の active 週の未AC問題の提出は見えない)
    supabase
      .from("submissions")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const events = eventsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];

  // レートイベントに週番号を付与
  const weekIds = [...new Set(events.map((e) => e.week_id))];
  const { data: weeks } = weekIds.length
    ? await supabase.from("raid_weeks").select("id, week_number").in("id", weekIds)
    : { data: [] };
  const weekNumberMap = new Map((weeks ?? []).map((w) => [w.id, w.week_number]));

  const chartEvents = events.map((e, i) => ({
    week_number: weekNumberMap.get(e.week_id) ?? i + 1,
    rating_before: e.rating_before,
    rating_after: e.rating_after,
  }));

  // 提出の問題情報
  const problemIds = [...new Set(submissions.map((s) => s.problem_id))];
  const { data: problems } = problemIds.length
    ? await supabase.from("problems").select("*").in("id", problemIds)
    : { data: [] };
  const problemMap = new Map((problems ?? []).map((p) => [p.id, p]));

  const items: SubmissionListItem[] = submissions.map((s) => {
    const problem = problemMap.get(s.problem_id);
    return {
      id: s.id,
      status: s.status,
      language: s.language,
      created_at: s.created_at,
      damage: s.damage,
      is_first_blood: s.is_first_blood,
      exec_time_ms: s.exec_time_ms,
      problemId: s.problem_id,
      problemTitle: problem?.title ?? "(非公開)",
      problemRank: problem?.rank,
    };
  });

  return (
    <div className="space-y-6">
      {/* プロフィールヘッダー */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-slate-600"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-2xl font-black text-slate-300">
              {profile.handle.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className={`text-2xl font-black ${ratingTextClass(profile.rating)}`}>
              {profile.handle}
            </h1>
            <p className="text-xs text-slate-500">
              参戦日: {formatDateJst(profile.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-800/50 p-4 text-center">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">
              レーティング
            </div>
            <div
              className={`mt-1 font-mono text-2xl font-black ${ratingTextClass(profile.rating)}`}
            >
              {profile.rating}
            </div>
          </div>
          <div className="rounded-xl bg-slate-800/50 p-4 text-center">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">色</div>
            <div className={`mt-1 text-2xl font-black ${ratingTextClass(profile.rating)}`}>
              {ratingColorName(profile.rating)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-800/50 p-4 text-center">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">EXP</div>
            <div className="mt-1 font-mono text-2xl font-black text-yellow-300">
              {formatInt(profile.exp)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-800/50 p-4 text-center">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">
              参加週数
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-slate-200">
              {events.length}
            </div>
          </div>
        </div>
      </div>

      {/* レート推移 */}
      <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm font-black tracking-widest text-purple-300">
          📈 レート推移
        </h2>
        <RatingChart events={chartEvents} />
        {events.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/70 text-left text-slate-400">
                  <th className="px-3 py-2">週</th>
                  <th className="px-3 py-2 text-right">週間ダメージ</th>
                  <th className="px-3 py-2 text-right">順位</th>
                  <th className="px-3 py-2 text-right">perf</th>
                  <th className="px-3 py-2 text-right">レート変化</th>
                </tr>
              </thead>
              <tbody>
                {[...events].reverse().map((e) => (
                  <tr key={e.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2 font-mono">
                      W{weekNumberMap.get(e.week_id) ?? "?"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-yellow-300">
                      💥{formatInt(e.damage_total)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">#{e.rank}</td>
                    <td className="px-3 py-2 text-right font-mono">{e.performance}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className={ratingTextClass(e.rating_before)}>
                        {e.rating_before}
                      </span>
                      <span className="mx-1 text-slate-500">→</span>
                      <span className={`font-bold ${ratingTextClass(e.rating_after)}`}>
                        {e.rating_after}
                      </span>
                      <span
                        className={`ml-1 ${
                          e.rating_after >= e.rating_before
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        ({e.rating_after >= e.rating_before ? "+" : ""}
                        {e.rating_after - e.rating_before})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 直近の提出 */}
      <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm font-black tracking-widest text-purple-300">
          📤 直近の提出
        </h2>
        <SubmissionList
          items={items}
          emptyMessage="表示できる提出がありません(他人の提出は AC 済み問題か週終了後のみ閲覧できます)"
        />
      </section>
    </div>
  );
}
