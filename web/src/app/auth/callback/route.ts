import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 外部サイトへのリダイレクトを防ぐ。同一オリジン内のパスだけを許可し、
// それ以外(絶対URL・プロトコル相対 `//host`・`/\host` などの外部指定)は / に落とす
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

// GitHub OAuth のコールバック: code をセッションに交換してリダイレクト
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 失敗時も遷移先を保持し、再ログインで同じページに戻れるようにする
  const retry = new URL("/login", origin);
  retry.searchParams.set("error", "auth_failed");
  if (next !== "/") retry.searchParams.set("next", next);
  return NextResponse.redirect(retry);
}
