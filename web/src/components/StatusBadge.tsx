import type { SubmissionStatus } from "@/lib/database.types";
import {
  Braces,
  Check,
  CircleAlert,
  Clock,
  LoaderCircle,
  Timer,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";

// 提出ステータスのバッジ。
// ステータス色はドメインデータの可視化(4系統カラー制限の例外 — CLAUDE.md)。
// 絵文字は使わず lucide アイコン + 淡色チップで表現する。
const STATUS_META: Record<
  SubmissionStatus,
  { label: string; icon: LucideIcon; cls: string; spin?: boolean }
> = {
  pending: {
    label: "ジャッジ待ち",
    icon: Clock,
    cls: "border-border bg-secondary text-muted-foreground",
  },
  running: {
    label: "実行中",
    icon: LoaderCircle,
    spin: true,
    cls: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  AC: { label: "AC", icon: Check, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  WA: { label: "WA", icon: X, cls: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  TLE: { label: "TLE", icon: Timer, cls: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
  RE: {
    label: "RE",
    icon: TriangleAlert,
    cls: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  },
  CE: { label: "CE", icon: Braces, cls: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
  IE: { label: "IE", icon: CircleAlert, cls: "border-slate-500/30 bg-slate-500/10 text-slate-300" },
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.IE;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold tracking-wide ${meta.cls}`}
    >
      <Icon className={`size-3 ${meta.spin ? "animate-spin" : ""}`} aria-hidden />
      {meta.label}
    </span>
  );
}
