"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// スレッド作成フォーム(problemId を渡すと問題別スレッドになる)
// 掲示板ページでは主要操作なので primary、問題ページでは主要操作(提出)と
// 競合しないよう secondary に落とす。
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
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder={
            problemId
              ? "この問題について相談するスレッドを立てる…"
              : "新しいスレッドのタイトル…"
          }
          className="flex-1"
        />
        <Button
          type="submit"
          variant={problemId ? "secondary" : "default"}
          disabled={submitting || !title.trim()}
        >
          <Plus aria-hidden />
          {submitting ? "作成中…" : "スレッド作成"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
