import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 全リクエストでセッションを更新し、未ログインは /login へリダイレクトする
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() でトークンを検証しつつセッションを更新(getSession は使わない)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = path.startsWith("/login") || path.startsWith("/auth");

  const redirectTo = (pathname: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    // ログイン後に元の内部URLへ戻すため、遷移先をクエリで引き継ぐ
    if (next) url.searchParams.set("next", next);
    const redirect = NextResponse.redirect(url);
    // 更新済みセッション Cookie をリダイレクトにも引き継ぐ
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  };

  if (!user && !isPublicPath) {
    // ルート(/)はログイン後の既定の戻り先なので next を付けない
    const target = `${path}${request.nextUrl.search}`;
    return redirectTo("/login", path === "/" ? undefined : target);
  }
  if (user && path.startsWith("/login")) {
    return redirectTo("/");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 静的アセット以外すべて
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
