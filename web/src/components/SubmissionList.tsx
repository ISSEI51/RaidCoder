import Link from "next/link";
import type { ProblemRank, SubmissionStatus } from "@/lib/database.types";
import { StatusBadge } from "@/components/StatusBadge";
import { RankBadge } from "@/components/RankBadge";
import { UserLink } from "@/components/UserLink";
import { languageLabel } from "@/lib/languages";
import { formatDateTimeJst, formatInt } from "@/lib/format";

export type SubmissionListItem = {
  id: string;
  status: SubmissionStatus;
  language: string;
  created_at: string;
  damage: number;
  is_first_blood: boolean;
  exec_time_ms: number | null;
  // 任意表示
  handle?: string;
  rating?: number;
  problemId?: string;
  problemTitle?: string;
  problemRank?: ProblemRank;
};

// 提出一覧テーブル(問題ページ・ユーザーページで共用)
export function SubmissionList({
  items,
  emptyMessage,
}: {
  items: SubmissionListItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/60">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-700/60 bg-slate-900/70 text-left text-xs text-slate-400">
            <th className="px-3 py-2">日時</th>
            {items.some((i) => i.handle !== undefined) && (
              <th className="px-3 py-2">ユーザー</th>
            )}
            {items.some((i) => i.problemTitle !== undefined) && (
              <th className="px-3 py-2">問題</th>
            )}
            <th className="px-3 py-2">言語</th>
            <th className="px-3 py-2">結果</th>
            <th className="px-3 py-2 text-right">ダメージ</th>
            <th className="px-3 py-2 text-right">実行時間</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-800/60 transition-colors last:border-0 hover:bg-slate-800/30"
            >
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-400">
                {formatDateTimeJst(item.created_at)}
              </td>
              {items.some((i) => i.handle !== undefined) && (
                <td className="px-3 py-2">
                  {item.handle !== undefined ? (
                    <UserLink handle={item.handle} rating={item.rating ?? 0} />
                  ) : (
                    "—"
                  )}
                </td>
              )}
              {items.some((i) => i.problemTitle !== undefined) && (
                <td className="px-3 py-2">
                  {item.problemId ? (
                    <Link
                      href={`/problems/${item.problemId}`}
                      className="inline-flex items-center gap-1.5 text-slate-200 hover:text-purple-300"
                    >
                      {item.problemRank && (
                        <RankBadge rank={item.problemRank} size="sm" />
                      )}
                      <span className="max-w-[16rem] truncate">{item.problemTitle}</span>
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              )}
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-300">
                {languageLabel(item.language)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={item.status} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-xs">
                {item.damage > 0 ? (
                  <span className="font-bold text-yellow-300">
                    💥{formatInt(item.damage)}
                    {item.is_first_blood && " ⚡"}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-xs text-slate-400">
                {item.exec_time_ms !== null ? `${item.exec_time_ms} ms` : "—"}
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/submissions/${item.id}`}
                  className="text-xs text-sky-400 hover:underline"
                >
                  詳細 →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
