import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { RankBadge } from "@/components/RankBadge";
import { UserLink } from "@/components/UserLink";
import { SubmissionLive } from "@/components/SubmissionLive";
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
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-black text-slate-100">提出詳細</h1>
          <StatusBadge status={submission.status} />
          {judging && <SubmissionLive submissionId={submission.id} />}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg bg-slate-800/50 p-3">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">問題</div>
            {problem ? (
              <Link
                href={`/problems/${problem.id}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sky-400 hover:underline"
              >
                <RankBadge rank={problem.rank} size="sm" />
                <span className="truncate">{problem.title}</span>
              </Link>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">
              ユーザー
            </div>
            <div className="mt-1">
              {profile ? (
                <UserLink handle={profile.handle} rating={profile.rating} />
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">
              テストケース
            </div>
            <div className="mt-1 font-mono">
              {submission.passed_count} / {submission.total_count}
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">
              実行時間
            </div>
            <div className="mt-1 font-mono">
              {submission.exec_time_ms !== null ? `${submission.exec_time_ms} ms` : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">
              メモリ
            </div>
            <div className="mt-1 font-mono">
              {submission.memory_kb !== null
                ? `${formatInt(submission.memory_kb)} KB`
                : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">
              ダメージ
            </div>
            <div className="mt-1 font-mono font-bold text-yellow-300">
              {submission.damage > 0 ? (
                <>
                  💥{formatInt(submission.damage)}
                  {submission.is_first_blood && (
                    <span className="ml-1 text-amber-300">⚡FB</span>
                  )}
                </>
              ) : (
                <span className="text-slate-600">0</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>提出: {formatDateTimeJst(submission.created_at)}</span>
          <span>判定: {formatDateTimeJst(submission.judged_at)}</span>
          <span>言語: {languageLabel(submission.language)}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/60">
        <div className="border-b border-slate-700/60 bg-slate-800/60 px-4 py-2 text-xs font-bold text-slate-300">
          提出コード({languageLabel(submission.language)})
        </div>
        <pre className="overflow-x-auto bg-slate-950/80 px-4 py-3 font-mono text-xs leading-relaxed text-slate-200">
          {submission.code}
        </pre>
      </div>
    </div>
  );
}
