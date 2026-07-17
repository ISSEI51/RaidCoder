"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 自分の投稿の削除ボタン(RLS により自分の投稿のみ削除可能)
export function DeletePostButton({ postId }: { postId: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("この投稿を削除しますか?")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("board_posts").delete().eq("id", postId);
    setDeleting(false);
    if (error) {
      alert(`削除に失敗しました: ${error.message}`);
      return;
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-slate-500 transition-colors hover:text-rose-400 disabled:opacity-50"
    >
      {deleting ? "削除中…" : "🗑 削除"}
    </button>
  );
}
