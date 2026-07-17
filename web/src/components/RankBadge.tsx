import type { ProblemRank } from "@/lib/database.types";
import { rankTier } from "@/lib/ranks";

// ランク S〜E のバッジ。
// ランク色は独自定義せず、レート色8段階(lib/rating.ts — 4系統カラー制限の例外)を
// lib/ranks.ts のマッピング経由で再利用する(S=赤 / A=橙 / B=黄 / C=青 / D=緑 / E=灰)。
// グラデーション・発光は使わず、淡い背景 + 同系色テキストのフラットな表現に抑える。
export function RankBadge({
  rank,
  size = "md",
}: {
  rank: ProblemRank;
  size?: "sm" | "md" | "lg";
}) {
  const tier = rankTier(rank);
  const sizeClass =
    size === "lg"
      ? "h-10 w-10 rounded-lg text-lg"
      : size === "sm"
        ? "h-6 w-6 rounded-md text-xs"
        : "h-8 w-8 rounded-lg text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border font-bold ${sizeClass}`}
      style={{
        color: tier.hex,
        borderColor: `${tier.hex}4d`, // 30%
        backgroundColor: `${tier.hex}1a`, // 10%
      }}
      title={`ランク ${rank}`}
    >
      {rank}
    </span>
  );
}
