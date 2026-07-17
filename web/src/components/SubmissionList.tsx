import Link from "next/link";
import { Flame, Zap } from "lucide-react";
import type { ProblemRank, SubmissionStatus } from "@/lib/database.types";
import { StatusBadge } from "@/components/StatusBadge";
import { RankBadge } from "@/components/RankBadge";
import { UserLink } from "@/components/UserLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const showUser = items.some((i) => i.handle !== undefined);
  const showProblem = items.some((i) => i.problemTitle !== undefined);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium text-muted-foreground">
              日時
            </TableHead>
            {showUser && (
              <TableHead className="text-xs font-medium text-muted-foreground">
                ユーザー
              </TableHead>
            )}
            {showProblem && (
              <TableHead className="text-xs font-medium text-muted-foreground">
                問題
              </TableHead>
            )}
            <TableHead className="text-xs font-medium text-muted-foreground">
              言語
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              結果
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground">
              ダメージ
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground">
              実行時間
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-xs text-muted-foreground tabular-nums">
                {formatDateTimeJst(item.created_at)}
              </TableCell>
              {showUser && (
                <TableCell>
                  {item.handle !== undefined ? (
                    <UserLink handle={item.handle} rating={item.rating ?? 0} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              {showProblem && (
                <TableCell>
                  {item.problemId ? (
                    <Link
                      href={`/problems/${item.problemId}`}
                      className="inline-flex items-center gap-1.5 text-foreground transition-colors hover:text-primary"
                    >
                      {item.problemRank && (
                        <RankBadge rank={item.problemRank} size="sm" />
                      )}
                      <span className="max-w-[16rem] truncate">
                        {item.problemTitle}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-xs text-muted-foreground">
                {languageLabel(item.language)}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right">
                {item.damage > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground tabular-nums">
                    <Flame className="size-3 text-muted-foreground" aria-hidden />
                    {formatInt(item.damage)}
                    {item.is_first_blood && (
                      <Zap className="size-3 text-primary" aria-hidden />
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                {item.exec_time_ms !== null ? `${item.exec_time_ms} ms` : "—"}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/submissions/${item.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  詳細
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
