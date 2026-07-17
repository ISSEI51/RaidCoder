import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ChevronRight,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BossAvatar } from "@/components/BossAvatar";
import { characterForWeek } from "@/lib/characters";
import { formatDateJst, formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "アーカイブ",
};

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
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Archive className="size-5 text-muted-foreground" aria-hidden />
          討伐アーカイブ
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          終了した週は解説・公式解・全員の提出コードが公開されています。
        </p>
      </div>

      {weeks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          まだ終了したレイドがありません。
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {weeks.map((week) => {
            const defeated = week.defeated_at !== null || week.boss_hp <= 0;
            const character = characterForWeek(week.week_number);
            return (
              <Link
                key={week.id}
                href={`/archive/${week.week_number}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-secondary/50"
              >
                <BossAvatar
                  character={character}
                  size={48}
                  defeated={defeated}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-bold tracking-widest text-muted-foreground tabular-nums">
                      WEEK {week.week_number}
                    </span>
                    <span className="truncate text-sm font-bold">
                      {week.boss_name}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      {formatDateJst(week.starts_at)} 〜{" "}
                      {formatDateJst(week.ends_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Users className="size-3" aria-hidden />
                      {participantCount.get(week.id) ?? 0}人
                    </span>
                  </div>
                </div>
                {defeated ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
                    <Trophy className="size-3" aria-hidden />
                    撃破
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-destructive tabular-nums">
                    <ShieldAlert className="size-3" aria-hidden />
                    生存(残りHP {formatInt(week.boss_hp)})
                  </span>
                )}
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
