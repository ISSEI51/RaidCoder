import type { SubmissionStatus } from "@/lib/database.types";

const STATUS_META: Record<SubmissionStatus, { label: string; cls: string }> = {
  pending: {
    label: "ジャッジ待ち",
    cls: "bg-slate-600/40 text-slate-300 border-slate-500/60",
  },
  running: {
    label: "実行中…",
    cls: "bg-blue-600/25 text-blue-300 border-blue-500/60 animate-pulse",
  },
  AC: { label: "AC", cls: "bg-emerald-600/25 text-emerald-300 border-emerald-500/70" },
  WA: { label: "WA", cls: "bg-amber-600/25 text-amber-300 border-amber-500/70" },
  TLE: { label: "TLE", cls: "bg-orange-600/25 text-orange-300 border-orange-500/70" },
  RE: { label: "RE", cls: "bg-rose-600/25 text-rose-300 border-rose-500/70" },
  CE: { label: "CE", cls: "bg-purple-600/25 text-purple-300 border-purple-500/70" },
  IE: { label: "IE", cls: "bg-gray-600/25 text-gray-300 border-gray-500/70" },
};

// 提出ステータスのバッジ
export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.IE;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold tracking-wide ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}
