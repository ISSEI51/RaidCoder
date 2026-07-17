import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "RaidCoder — 協力レイド型 競技プログラミング",
    template: "%s | RaidCoder",
  },
  description:
    "AI が毎週生成するボスを、みんなの AC で討伐する非同期協力型・競技プログラミングゲーム",
};

// 全ページ認証必須・ライブデータ表示のため常に動的レンダリング
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ダークテーマ固定(shadcn の dark: variant 用に .dark を常時付与 — globals.css 参照)
    <html lang="ja" className={cn("dark font-sans", inter.variable)}>
      <body className="flex min-h-svh flex-col antialiased">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
            RaidCoder — 毎週月曜 00:00 JST に新しいボスが現れる
          </div>
        </footer>
      </body>
    </html>
  );
}
