import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
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
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <MessagesSquare className="size-5 text-primary" aria-hidden />
          掲示板
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          アイデア相談は協力プレイの一部として歓迎。コードそのものの共有は AC
          後の閲覧機能でどうぞ。
        </p>
      </div>

      {user && (
        <NewThreadForm userId={user.id} weekId={activeWeekRes.data?.id ?? null} />
      )}

      {threads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          まだスレッドがありません。最初のスレッドを立てよう!
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {threads.map((thread) => {
            const author = profileMap.get(thread.author_id);
            const problem = thread.problem_id
              ? problemMap.get(thread.problem_id)
              : null;
            return (
              <li
                key={thread.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3"
              >
                <Link
                  href={`/board/${thread.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-bold transition-colors hover:text-primary"
                >
                  {thread.title}
                </Link>
                {problem && (
                  <Link
                    href={`/problems/${problem.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RankBadge rank={problem.rank} size="sm" />
                    <span className="max-w-[10rem] truncate">{problem.title}</span>
                  </Link>
                )}
                <span
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums"
                  title="投稿数"
                >
                  <MessagesSquare className="size-3" aria-hidden />
                  {postCount.get(thread.id) ?? 0}
                </span>
                {author && (
                  <span className="text-xs">
                    <UserLink handle={author.handle} rating={author.rating} />
                  </span>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDateTimeJst(thread.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
