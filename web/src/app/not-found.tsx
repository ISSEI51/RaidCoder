import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold">404 — 見つかりません</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        このページは存在しないか、まだ閲覧できません(週終了後に公開されるものかもしれません)。
      </p>
      <Button asChild className="mt-2">
        <Link href="/">レイドに戻る</Link>
      </Button>
    </div>
  );
}
