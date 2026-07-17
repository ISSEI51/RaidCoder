"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, MessagesSquare, Swords, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ヘッダーのグローバルナビ(クライアント側で現在地のアクティブ表示を行う)。
// モバイルではアイコンのみ、sm 以上でラベルを表示して崩れを防ぐ。
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "レイド", icon: Swords },
  { href: "/ranking", label: "ランキング", icon: Trophy },
  { href: "/board", label: "掲示板", icon: MessagesSquare },
  { href: "/archive", label: "アーカイブ", icon: Archive },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") {
    // 問題・提出ページはレイドの配下として扱う
    return (
      pathname === "/" ||
      pathname.startsWith("/problems") ||
      pathname.startsWith("/submissions")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
