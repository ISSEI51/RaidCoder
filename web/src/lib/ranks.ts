import type { ProblemRank } from "@/lib/database.types";
import { ratingTier, type RatingTier } from "@/lib/rating";

// 問題ランクの表示順(S が最上位)
export const RANK_ORDER: ProblemRank[] = ["S", "A", "B", "C", "D", "E"];

// 問題ランクの色は独自に定義せず、レート色8段階(lib/rating.ts —
// 4系統カラー制限の唯一のドメイン色例外のひとつ)へマッピングして再利用する。
// S=赤 / A=橙 / B=黄 / C=青 / D=緑 / E=灰(6段なので水・茶は使わない)
const RANK_RATING: Record<ProblemRank, number> = {
  S: 2000,
  A: 1800,
  B: 1600,
  C: 1400,
  D: 1000,
  E: 0,
};

export function rankTier(rank: ProblemRank): RatingTier {
  return ratingTier(RANK_RATING[rank]);
}

export function sortByRank<T extends { rank: ProblemRank }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank),
  );
}
