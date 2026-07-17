import type { Metadata } from "next";
import { Medal, Swords, TrendingUp, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Tabs } from "@/components/Tabs";
import { UserLink } from "@/components/UserLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ratingColorName, ratingTextClass } from "@/lib/rating";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "ランキング",
};

// 順位セル: 1〜3位はアイコン+太字タイポグラフィで強調(色は使わない)
function RankCell({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
        <Trophy className="size-4" aria-hidden />
        {rank}
      </span>
    );
  }
  if (rank <= 3) {
    return (
      <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
        <Medal className="size-4 text-muted-foreground" aria-hidden />
        {rank}
      </span>
    );
  }
  return <span className="tabular-nums text-muted-foreground">{rank}</span>;
}

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
        <p className="mb-3 text-xs text-muted-foreground">
          WEEK {week.week_number}「{week.boss_name}」への週間累計ダメージ
        </p>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">
          現在開催中のレイドはありません(ボス準備中)
        </p>
      )}
      {leaderboard.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          まだ誰もダメージを与えていません
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 px-3 text-xs text-muted-foreground">
                  順位
                </TableHead>
                <TableHead className="px-3 text-xs text-muted-foreground">
                  ユーザー
                </TableHead>
                <TableHead className="px-3 text-right text-xs text-muted-foreground">
                  週間ダメージ
                </TableHead>
                <TableHead className="px-3 text-right text-xs text-muted-foreground">
                  AC数
                </TableHead>
                <TableHead className="px-3 text-right text-xs text-muted-foreground">
                  レート
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, i) => (
                <TableRow key={entry.user_id}>
                  <TableCell className="px-3">
                    <RankCell rank={i + 1} />
                  </TableCell>
                  <TableCell className="px-3">
                    <UserLink
                      handle={entry.handle}
                      rating={entry.rating}
                      avatarUrl={entry.avatar_url}
                      showAvatar
                    />
                  </TableCell>
                  <TableCell className="px-3 text-right font-semibold tabular-nums">
                    {formatInt(entry.total_damage)}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums text-muted-foreground">
                    {formatInt(entry.solved_count)}
                  </TableCell>
                  <TableCell
                    className={`px-3 text-right font-bold tabular-nums ${ratingTextClass(entry.rating)}`}
                  >
                    {entry.rating}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  const overallContent = (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="min-w-[480px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-16 px-3 text-xs text-muted-foreground">
              順位
            </TableHead>
            <TableHead className="px-3 text-xs text-muted-foreground">
              ユーザー
            </TableHead>
            <TableHead className="px-3 text-right text-xs text-muted-foreground">
              レート
            </TableHead>
            <TableHead className="px-3 text-xs text-muted-foreground">色</TableHead>
            <TableHead className="px-3 text-right text-xs text-muted-foreground">
              EXP
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile, i) => (
            <TableRow key={profile.id}>
              <TableCell className="px-3">
                <RankCell rank={i + 1} />
              </TableCell>
              <TableCell className="px-3">
                <UserLink
                  handle={profile.handle}
                  rating={profile.rating}
                  avatarUrl={profile.avatar_url}
                  showAvatar
                />
              </TableCell>
              <TableCell
                className={`px-3 text-right text-base font-bold tabular-nums ${ratingTextClass(profile.rating)}`}
              >
                {profile.rating}
              </TableCell>
              <TableCell
                className={`px-3 text-xs font-bold ${ratingTextClass(profile.rating)}`}
              >
                {ratingColorName(profile.rating)}
              </TableCell>
              <TableCell className="px-3 text-right tabular-nums text-muted-foreground">
                {formatInt(profile.exp)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Trophy className="size-5 text-muted-foreground" aria-hidden />
        ランキング
      </h1>
      <Tabs
        items={[
          {
            key: "weekly",
            label: (
              <span className="flex items-center gap-1.5">
                <Swords className="size-4" aria-hidden />
                今週のダメージ
              </span>
            ),
            content: weeklyContent,
          },
          {
            key: "overall",
            label: (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="size-4" aria-hidden />
                総合レート
              </span>
            ),
            content: overallContent,
          },
        ]}
      />
    </div>
  );
}
