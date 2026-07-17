import Link from "next/link";
import { Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ratingTextClass } from "@/lib/rating";
import { LogoutButton } from "@/components/LogoutButton";
import { HeaderNav } from "@/components/HeaderNav";

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-base font-black tracking-wide text-foreground"
        >
          <Swords className="size-5 text-primary" aria-hidden />
          <span>
            Raid<span className="text-primary">Coder</span>
          </span>
        </Link>

        {user && <HeaderNav />}

        {user && profile && (
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Link
              href={`/users/${encodeURIComponent(profile.handle)}`}
              className="flex min-w-0 shrink-0 items-center gap-2"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full border border-border"
                />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
                  {profile.handle.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span
                className={`hidden truncate text-sm font-bold lg:inline ${ratingTextClass(profile.rating)}`}
              >
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
