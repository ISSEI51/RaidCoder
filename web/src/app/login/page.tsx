import type { Metadata } from "next";
import { MessagesSquare, Swords, Trophy, Zap, type LucideIcon } from "lucide-react";
import { LoginButton } from "@/components/LoginButton";

export const metadata: Metadata = {
  title: "ログイン",
};

const FEATURES: { icon: LucideIcon; text: React.ReactNode }[] = [
  { icon: Swords, text: "毎週月曜、ランク S〜E の6問とボスが出現" },
  { icon: Zap, text: "AC するとランク・速度・先制に応じたダメージ" },
  { icon: Trophy, text: "週間ダメージで順位が付き、レーティングが変動" },
  { icon: MessagesSquare, text: "掲示板でアイデア相談 OK。解説は週終了後に公開" },
];

// ゲーム風ランディング + GitHub ログイン(主要操作はログインボタン1つ)
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    // mx/px の calc は main の余白を打ち消して画面幅いっぱいに広げるため(装飾を画面端で切る)
    <div className="relative mx-[calc(50%-50vw)] overflow-hidden px-[calc(50vw-50%)]">
      {/* ボスの気配を見せる背景装飾。左右の端から半身だけ覗かせ、本文の可読性を優先し低不透明度で敷く */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/characters/architect.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-0 hidden w-[36rem] -translate-x-1/2 -translate-y-1/2 opacity-15 select-none md:block lg:w-[51rem]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/characters/commander.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0 hidden w-[36rem] translate-x-1/2 -translate-y-1/2 opacity-15 select-none md:block lg:w-[51rem]"
      />

      <div className="relative mx-auto flex max-w-lg flex-col items-center py-10 sm:py-16">
      <p className="text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
        Weekly Raid × Competitive Programming
      </p>
      <h1 className="mt-3 text-center text-5xl font-black tracking-tight sm:text-6xl">
        Raid<span className="text-primary">Coder</span>
      </h1>
      <p className="mt-4 max-w-md text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
        <span className="block">
          AI が毎週生成するレイドボスを、
          <span className="font-semibold text-foreground">みんなの AC</span>
          で討伐する
        </span>
        <span className="block">非同期協力型・競技プログラミングゲーム</span>
      </p>

      <div className="mt-10 w-full divide-y divide-border border-y border-border text-left">
        {FEATURES.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Icon className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="text-sm">{text}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-8 w-full rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          認証に失敗しました。もう一度お試しください。
        </p>
      )}

      <div className="mt-8 flex w-full justify-center">
        <LoginButton />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        参戦には GitHub アカウントが必要です
      </p>
      </div>
    </div>
  );
}
