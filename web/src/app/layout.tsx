import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Header } from "@/components/Header";

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
    <html lang="ja">
      <body className="antialiased">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-600">
          ⚔️ RaidCoder — 毎週月曜 00:00 JST に新しいボスが現れる
        </footer>
      </body>
    </html>
  );
}
