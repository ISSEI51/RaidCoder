import { notFound } from "next/navigation";
import { History, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RatingChart } from "@/components/RatingChart";
import { SubmissionList, type SubmissionListItem } from "@/components/SubmissionList";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const stats: { label: string; value: string; valueClass: string }[] = [
    {
      label: "レーティング",
      value: String(profile.rating),
      valueClass: ratingTextClass(profile.rating),
    },
    {
      label: "色",
      value: ratingColorName(profile.rating),
      valueClass: ratingTextClass(profile.rating),
    },
    { label: "EXP", value: formatInt(profile.exp), valueClass: "text-foreground" },
    { label: "参加週数", value: String(events.length), valueClass: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* プロフィールヘッダー */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full border border-border"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-muted-foreground">
              {profile.handle.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className={`text-xl font-bold ${ratingTextClass(profile.rating)}`}>
              {profile.handle}
            </h1>
            <p className="text-xs text-muted-foreground">
              参戦日: {formatDateJst(profile.created_at)}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd
                className={`mt-1 text-2xl font-bold tabular-nums ${stat.valueClass}`}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* レート推移 */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <TrendingUp className="size-5 text-muted-foreground" aria-hidden />
          レート推移
        </h2>
        <RatingChart events={chartEvents} />
        {events.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[480px] text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-3 text-xs text-muted-foreground">
                    週
                  </TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">
                    週間ダメージ
                  </TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">
                    順位
                  </TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">
                    perf
                  </TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">
                    レート変化
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...events].reverse().map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="px-3 tabular-nums">
                      W{weekNumberMap.get(e.week_id) ?? "?"}
                    </TableCell>
                    <TableCell className="px-3 text-right font-semibold tabular-nums">
                      {formatInt(e.damage_total)}
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums">
                      #{e.rank}
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums">
                      {e.performance}
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums">
                      <span className={ratingTextClass(e.rating_before)}>
                        {e.rating_before}
                      </span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className={`font-bold ${ratingTextClass(e.rating_after)}`}>
                        {e.rating_after}
                      </span>
                      <span
                        className={`ml-1 ${
                          e.rating_after >= e.rating_before
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                      >
                        ({e.rating_after >= e.rating_before ? "+" : ""}
                        {e.rating_after - e.rating_before})
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* 直近の提出 */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <History className="size-5 text-muted-foreground" aria-hidden />
          直近の提出
        </h2>
        <SubmissionList
          items={items}
          emptyMessage="表示できる提出がありません(他人の提出は AC 済み問題か週終了後のみ閲覧できます)"
        />
      </section>
    </div>
  );
}
