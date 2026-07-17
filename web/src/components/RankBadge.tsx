import type { ProblemRank } from "@/lib/database.types";
import { RANK_META } from "@/lib/ranks";

// ランク S〜E の色分けバッジ
export function RankBadge({
  rank,
  size = "md",
}: {
  rank: ProblemRank;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "h-10 w-10 text-xl"
      : size === "sm"
        ? "h-6 w-6 text-xs"
        : "h-8 w-8 text-base";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-black shadow-lg ring-2 ${sizeClass} ${RANK_META[rank].badgeClass} ${RANK_META[rank].ringClass}`}
      title={`ランク ${rank}`}
    >
      {rank}
    </span>
  );
}
