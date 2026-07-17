"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 投稿フォーム(Markdown 対応)
export function NewPostForm({
  threadId,
  userId,
}: {
  threadId: string;
  userId: string;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("board_posts").insert({
      thread_id: threadId,
      author_id: userId,
      body_md: body.trim(),
    });
    setSubmitting(false);
    if (err) {
      setError(`投稿に失敗しました: ${err.message}`);
      return;
    }
    setBody("");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={20000}
        rows={4}
        placeholder="Markdown で投稿できます。アイデア相談は協力プレイの一部として歓迎!(数式は $...$)"
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
        >
          {submitting ? "投稿中…" : "💬 投稿する"}
        </button>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    </form>
  );
}
