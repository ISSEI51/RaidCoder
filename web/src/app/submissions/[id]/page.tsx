import Link from "next/link";
import { notFound } from "next/navigation";
import { FileCode2, Flame, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { RankBadge } from "@/components/RankBadge";
import { UserLink } from "@/components/UserLink";
import { SubmissionLive } from "@/components/SubmissionLive";
import { Separator } from "@/components/ui/separator";
import { languageLabel } from "@/lib/languages";
import { formatDateTimeJst, formatInt } from "@/lib/format";

// 提出詳細ページ(RLS で閲覧可能なもののみ取得できる)
export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!submission) notFound();

  const [problemRes, profileRes] = await Promise.all([
    supabase.from("problems").select("*").eq("id", submission.problem_id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", submission.user_id).maybeSingle(),
  ]);
  const problem = problemRes.data;
  const profile = profileRes.data;

  const judging = submission.status === "pending" || submission.status === "running";

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">提出詳細</h1>
          <StatusBadge status={submission.status} />
          {judging && <SubmissionLive submissionId={submission.id} />}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            提出: {formatDateTimeJst(submission.created_at)}
          </span>
          <span className="tabular-nums">
            判定: {formatDateTimeJst(submission.judged_at)}
          </span>
          <span>言語: {languageLabel(submission.language)}</span>
        </div>
      </header>

      <Separator />

      {/* 判定サマリー(カードで囲わず、密度の高いスタッツ行で見せる) */}
      <dl className="flex flex-wrap gap-x-10 gap-y-4">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">問題</dt>
          <dd className="mt-1 text-sm">
            {problem ? (
              <Link
                href={`/problems/${problem.id}`}
                className="inline-flex max-w-[20rem] items-center gap-1.5 text-foreground transition-colors hover:text-primary"
              >
                <RankBadge rank={problem.rank} size="sm" />
                <span className="truncate">{problem.title}</span>
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">ユーザー</dt>
          <dd className="mt-1 text-sm">
            {profile ? (
              <UserLink handle={profile.handle} rating={profile.rating} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">テストケース</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums">
            {submission.passed_count} / {submission.total_count}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">実行時間</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums">
            {submission.exec_time_ms !== null
              ? `${submission.exec_time_ms} ms`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">メモリ</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums">
            {submission.memory_kb !== null
              ? `${formatInt(submission.memory_kb)} KB`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">ダメージ</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums">
            {submission.damage > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3 text-muted-foreground" aria-hidden />
                {formatInt(submission.damage)}
                {submission.is_first_blood && (
                  <span className="inline-flex items-center gap-0.5 text-primary">
                    <Zap className="size-3" aria-hidden />
                    FB
                  </span>
                )}
              </span>
            ) : (
              <span className="font-medium text-muted-foreground">0</span>
            )}
          </dd>
        </div>
      </dl>

      {/* 提出コード */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-2 text-xs font-medium">
          <FileCode2 className="size-4 text-muted-foreground" aria-hidden />
          提出コード({languageLabel(submission.language)})
        </div>
        <pre className="overflow-x-auto bg-card px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
          {submission.code}
        </pre>
      </div>
    </div>
  );
}
