import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ratingTextClass } from "@/lib/rating";
import { LogoutButton } from "@/components/LogoutButton";

// 全ページ共通ヘッダー(未ログイン時はロゴのみ)
export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-black tracking-wider text-slate-100"
        >
          ⚔️ Raid<span className="text-purple-400">Coder</span>
        </Link>

        {user && (
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-slate-400">
            <Link href="/" className="transition-colors hover:text-purple-300">
              🐉 レイド
            </Link>
            <Link href="/ranking" className="transition-colors hover:text-purple-300">
              🏆 ランキング
            </Link>
            <Link href="/board" className="transition-colors hover:text-purple-300">
              💬 掲示板
            </Link>
            <Link href="/archive" className="transition-colors hover:text-purple-300">
              📜 アーカイブ
            </Link>
          </nav>
        )}

        {user && profile && (
          <div className="ml-auto flex items-center gap-3">
            <Link
              href={`/users/${encodeURIComponent(profile.handle)}`}
              className="flex items-center gap-2"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full border border-slate-600"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs">
                  {profile.handle.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className={`text-sm font-bold ${ratingTextClass(profile.rating)}`}>
                {profile.handle}
              </span>
            </Link>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
