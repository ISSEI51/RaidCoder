"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

// ログアウトボタン(モバイルではアイコンのみ表示)
export function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="text-muted-foreground hover:text-foreground"
    >
      <LogOut aria-hidden />
      <span className="hidden md:inline">ログアウト</span>
    </Button>
  );
}
