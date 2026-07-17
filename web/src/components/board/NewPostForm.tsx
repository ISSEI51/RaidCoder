"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// 投稿フォーム(Markdown 対応)。スレッドページの主要操作なので primary ボタン
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
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={20000}
        rows={4}
        placeholder="Markdown で投稿できます。アイデア相談は協力プレイの一部として歓迎!(数式は $...$)"
        className="min-h-24"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting || !body.trim()}>
          <Send aria-hidden />
          {submitting ? "投稿中…" : "投稿する"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </form>
  );
}
