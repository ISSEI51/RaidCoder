"use client";

import { createClient } from "@/lib/supabase/client";

// ログアウトボタン
export function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-slate-600/60 px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:border-rose-500/60 hover:text-rose-300"
    >
      ログアウト
    </button>
  );
}
