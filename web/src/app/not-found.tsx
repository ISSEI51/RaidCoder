import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="text-6xl">🕳️</div>
      <h1 className="text-2xl font-black text-slate-200">404 — 見つかりません</h1>
      <p className="text-sm text-slate-400">
        このページは存在しないか、まだ閲覧できません(週終了後に公開されるものかもしれません)。
      </p>
      <Link
        href="/"
        className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-bold text-white hover:bg-purple-500"
      >
        ⚔️ レイドに戻る
      </Link>
    </div>
  );
}
