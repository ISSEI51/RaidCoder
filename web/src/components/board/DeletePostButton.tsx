"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// 自分の投稿の削除ボタン(RLS により自分の投稿のみ削除可能)。
// 破壊的操作: 通常は控えめな ghost、hover で destructive 色を出す
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
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={handleDelete}
      disabled={deleting}
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 aria-hidden />
      {deleting ? "削除中…" : "削除"}
    </Button>
  );
}
