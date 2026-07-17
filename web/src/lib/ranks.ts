import type { ProblemRank } from "@/lib/database.types";

// 問題ランクの表示順(S が最上位)
export const RANK_ORDER: ProblemRank[] = ["S", "A", "B", "C", "D", "E"];

export const RANK_META: Record<
  ProblemRank,
  { badgeClass: string; ringClass: string }
> = {
  S: {
    badgeClass: "bg-gradient-to-br from-fuchsia-500 to-red-600 text-white",
    ringClass: "ring-fuchsia-500/40",
  },
  A: {
    badgeClass: "bg-gradient-to-br from-orange-400 to-red-500 text-white",
    ringClass: "ring-orange-500/40",
  },
  B: {
    badgeClass: "bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900",
    ringClass: "ring-yellow-500/40",
  },
  C: {
    badgeClass: "bg-gradient-to-br from-green-400 to-emerald-600 text-slate-900",
    ringClass: "ring-green-500/40",
  },
  D: {
    badgeClass: "bg-gradient-to-br from-sky-400 to-blue-600 text-white",
    ringClass: "ring-sky-500/40",
  },
  E: {
    badgeClass: "bg-gradient-to-br from-slate-400 to-slate-600 text-white",
    ringClass: "ring-slate-500/40",
  },
};

export function sortByRank<T extends { rank: ProblemRank }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank),
  );
}
