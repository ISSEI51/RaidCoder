// レーティング色分け(CONTRACT.md §5)
// 2000+ 赤 / 1800+ 橙 / 1600+ 黄 / 1400+ 青 / 1200+ 水 / 1000+ 緑 / 800+ 茶 / それ未満 灰
// 名前・グラフ・ランキングなどすべての表示でこのユーティリティを共通使用する。
// 色はドメインデータの可視化(4系統カラー制限の例外 — CLAUDE.md)。
// ダーク背景で読めるよう Tailwind の -400 系を基準とし、茶のみ明度を上げた固有色を使う。

export type RatingTier = {
  min: number;
  name: string;
  textClass: string;
  hex: string;
};

export const RATING_TIERS: RatingTier[] = [
  { min: 2000, name: "赤", textClass: "text-red-400", hex: "#f87171" },
  { min: 1800, name: "橙", textClass: "text-orange-400", hex: "#fb923c" },
  { min: 1600, name: "黄", textClass: "text-yellow-400", hex: "#facc15" },
  { min: 1400, name: "青", textClass: "text-blue-400", hex: "#60a5fa" },
  { min: 1200, name: "水", textClass: "text-cyan-400", hex: "#22d3ee" },
  { min: 1000, name: "緑", textClass: "text-green-400", hex: "#4ade80" },
  { min: 800, name: "茶", textClass: "text-[#bf8f60]", hex: "#bf8f60" },
  { min: Number.NEGATIVE_INFINITY, name: "灰", textClass: "text-gray-400", hex: "#9ca3af" },
];

export function ratingTier(rating: number): RatingTier {
  return RATING_TIERS.find((t) => rating >= t.min) ?? RATING_TIERS[RATING_TIERS.length - 1];
}

export function ratingTextClass(rating: number): string {
  return ratingTier(rating).textClass;
}

export function ratingHex(rating: number): string {
  return ratingTier(rating).hex;
}

export function ratingColorName(rating: number): string {
  return ratingTier(rating).name;
}
