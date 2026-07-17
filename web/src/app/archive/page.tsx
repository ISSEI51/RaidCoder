import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateJst, formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "アーカイブ",
};

const BOSS_EMOJI = ["🐉", "👹", "💀", "🦖", "🐲", "🧟", "🤖", "👾", "🦑", "😈"];

// 過去週(ended)の一覧
export default async function ArchivePage() {
  const supabase = await createClient();

  const [weeksRes, countsRes] = await Promise.all([
    supabase
      .from("raid_weeks")
      .select("*")
      .eq("status", "ended")
      .order("week_number", { ascending: false }),
    // 参加者数 = その週の rating_events 数(行を数えると max_rows で打ち切られるため集計ビューを使う)
    supabase.from("week_participant_counts").select("*"),
  ]);

  const weeks = weeksRes.data ?? [];

  const participantCount = new Map<string, number>();
  for (const row of countsRes.data ?? []) {
    participantCount.set(row.week_id, row.participant_count);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-slate-100">📜 討伐アーカイブ</h1>
        <p className="mt-1 text-xs text-slate-400">
          終了した週は解説・公式解・全員の提出コードが公開されています。
        </p>
      </div>

      {weeks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
          まだ終了したレイドがありません。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weeks.map((week) => {
            const defeated = week.defeated_at !== null || week.boss_hp <= 0;
            const emoji = BOSS_EMOJI[Math.abs(week.week_number) % BOSS_EMOJI.length];
            return (
              <Link
                key={week.id}
                href={`/archive/${week.week_number}`}
                className="group rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-purple-500/60 hover:bg-slate-800/60"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold tracking-widest">
                    WEEK {week.week_number}
                  </span>
                  <span>
                    {formatDateJst(week.starts_at)} 〜 {formatDateJst(week.ends_at)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className={`text-4xl ${defeated ? "opacity-50 grayscale" : ""}`}>
                    {defeated ? "☠️" : emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-black text-slate-100 group-hover:text-purple-200">
                      {week.boss_name}
                    </div>
                    <div className="mt-0.5 text-xs">
                      {defeated ? (
                        <span className="font-bold text-yellow-300">🎉 撃破成功</span>
                      ) : (
                        <span className="font-bold text-rose-400">
                          😱 生存(残りHP {formatInt(week.boss_hp)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  👥 参加者 {participantCount.get(week.id) ?? 0}人
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
