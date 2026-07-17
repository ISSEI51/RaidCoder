import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/Markdown";
import { UserLink } from "@/components/UserLink";
import { RankBadge } from "@/components/RankBadge";
import { NewPostForm } from "@/components/board/NewPostForm";
import { DeletePostButton } from "@/components/board/DeletePostButton";
import { formatDateTimeJst } from "@/lib/format";

// スレッドページ: 投稿一覧(Markdown)+ 投稿 + 自分の投稿の削除
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: thread } = await supabase
    .from("board_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) notFound();

  const [postsRes, problemRes] = await Promise.all([
    supabase
      .from("board_posts")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true }),
    thread.problem_id
      ? supabase.from("problems").select("*").eq("id", thread.problem_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const posts = postsRes.data ?? [];
  const problem = problemRes.data;

  const authorIds = [...new Set([thread.author_id, ...posts.map((p) => p.author_id)])];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", authorIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const threadAuthor = profileMap.get(thread.author_id);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" aria-hidden />
          掲示板に戻る
        </Link>
        <h1 className="mt-2 text-xl font-bold">{thread.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {threadAuthor && (
            <UserLink handle={threadAuthor.handle} rating={threadAuthor.rating} />
          )}
          <span className="tabular-nums">{formatDateTimeJst(thread.created_at)}</span>
          {problem && (
            <Link
              href={`/problems/${problem.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-1.5 py-0.5 transition-colors hover:text-foreground"
            >
              <RankBadge rank={problem.rank} size="sm" />
              <span>{problem.title}</span>
            </Link>
          )}
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          まだ投稿がありません。最初の一言をどうぞ!
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {posts.map((post) => {
            const author = profileMap.get(post.author_id);
            return (
              <li key={post.id} className="py-4">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {author ? (
                    <UserLink handle={author.handle} rating={author.rating} />
                  ) : (
                    <span>???</span>
                  )}
                  <span className="tabular-nums">
                    {formatDateTimeJst(post.created_at)}
                  </span>
                  {post.author_id === user.id && (
                    <span className="ml-auto">
                      <DeletePostButton postId={post.id} />
                    </span>
                  )}
                </div>
                <Markdown>{post.body_md}</Markdown>
              </li>
            );
          })}
        </ul>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">投稿する</h2>
        <NewPostForm threadId={thread.id} userId={user.id} />
      </section>
    </div>
  );
}
