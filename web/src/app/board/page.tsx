import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserLink } from "@/components/UserLink";
import { NewThreadForm } from "@/components/board/NewThreadForm";
import { RankBadge } from "@/components/RankBadge";
import { formatDateTimeJst } from "@/lib/format";

export const metadata: Metadata = {
  title: "掲示板",
};

// 掲示板: スレッド一覧(全体+問題別が混在)+ スレッド作成
export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [threadsRes, activeWeekRes] = await Promise.all([
    supabase
      .from("board_threads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("raid_weeks").select("id").eq("status", "active").maybeSingle(),
  ]);

  const threads = threadsRes.data ?? [];
  const threadIds = threads.map((t) => t.id);

  // 作者プロフィール・問題情報・投稿数(投稿数は max_rows 打ち切り回避のため集計ビュー)
  const authorIds = [...new Set(threads.map((t) => t.author_id))];
  const problemIds = [
    ...new Set(threads.map((t) => t.problem_id).filter((p): p is string => !!p)),
  ];
  const [profilesRes, problemsRes, postCountsRes] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("*").in("id", authorIds)
      : Promise.resolve({ data: [] as never[] }),
    problemIds.length
      ? supabase.from("problems").select("*").in("id", problemIds)
      : Promise.resolve({ data: [] as never[] }),
    threadIds.length
      ? supabase
          .from("board_thread_post_counts")
          .select("*")
          .in("thread_id", threadIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const problemMap = new Map((problemsRes.data ?? []).map((p) => [p.id, p]));

  const postCount = new Map<string, number>();
  for (const row of postCountsRes.data ?? []) {
    postCount.set(row.thread_id, row.post_count);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-slate-100">💬 冒険者の酒場(掲示板)</h1>
        <p className="mt-1 text-xs text-slate-400">
          アイデア相談は協力プレイの一部として歓迎!コードそのものの共有は AC 後の閲覧機能でどうぞ。
        </p>
      </div>

      {user && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
          <NewThreadForm userId={user.id} weekId={activeWeekRes.data?.id ?? null} />
        </div>
      )}

      {threads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
          まだスレッドがありません。最初のスレッドを立てよう!
        </p>
      ) : (
        <ul className="space-y-2">
          {threads.map((thread) => {
            const author = profileMap.get(thread.author_id);
            const problem = thread.problem_id
              ? problemMap.get(thread.problem_id)
              : null;
            return (
              <li key={thread.id}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 transition-colors hover:border-purple-500/60">
                  <Link
                    href={`/board/${thread.id}`}
                    className="min-w-0 flex-1 truncate font-bold text-slate-100 hover:text-purple-300"
                  >
                    🧵 {thread.title}
                  </Link>
                  {problem && (
                    <Link
                      href={`/problems/${problem.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-600/60 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300 hover:border-purple-500/60"
                    >
                      <RankBadge rank={problem.rank} size="sm" />
                      <span className="max-w-[10rem] truncate">{problem.title}</span>
                    </Link>
                  )}
                  <span className="text-xs text-slate-500">
                    💬 {postCount.get(thread.id) ?? 0}
                  </span>
                  {author && (
                    <span className="text-xs">
                      <UserLink handle={author.handle} rating={author.rating} />
                    </span>
                  )}
                  <span className="text-xs text-slate-600">
                    {formatDateTimeJst(thread.created_at)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
