import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/next-path";

// GitHub OAuth のコールバック: code をセッションに交換してリダイレクト
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")) ?? "/";

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
