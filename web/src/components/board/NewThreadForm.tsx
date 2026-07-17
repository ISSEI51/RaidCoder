"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// スレッド作成フォーム(problemId を渡すと問題別スレッドになる)
export function NewThreadForm({
  userId,
  problemId,
  weekId,
}: {
  userId: string;
  problemId?: string | null;
  weekId?: string | null;
}) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("board_threads")
      .insert({
        title: title.trim(),
        author_id: userId,
        problem_id: problemId ?? null,
        week_id: weekId ?? null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (err || !data) {
      setError(`スレッドの作成に失敗しました: ${err?.message ?? ""}`);
      return;
    }
    setTitle("");
    router.push(`/board/${data.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder={
          problemId
            ? "この問題について相談するスレッドを立てる…"
            : "新しいスレッドのタイトル…"
        }
        className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
      />
      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
      >
        {submitting ? "作成中…" : "🧵 スレッド作成"}
      </button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </form>
  );
}
