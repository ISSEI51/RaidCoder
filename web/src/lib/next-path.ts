// ログイン後の戻り先(next)の検証。middleware が付ける `?next=` は
// URL から来るためユーザーが自由に細工できる。同一オリジン内のパスだけを許可し、
// 絶対URL・プロトコル相対 `//host`・`/\host` のような外部指定は捨てる。
// 判定を1箇所に集約するため、login ページと /auth/callback の両方からこれを呼ぶ。
export function safeNextPath(
  next: string | string[] | undefined | null,
): string | undefined {
  // 同名クエリが複数あると Next.js は string[] を渡す。その場合は採用しない
  if (typeof next !== "string") return undefined;
  if (!next.startsWith("/")) return undefined;
  if (next.startsWith("//") || next.startsWith("/\\")) return undefined;
  return next;
}
