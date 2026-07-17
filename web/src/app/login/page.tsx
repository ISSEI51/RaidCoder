import type { Metadata } from "next";
import { LoginButton } from "@/components/LoginButton";

export const metadata: Metadata = {
  title: "ログイン",
};

// ゲーム風ランディング + GitHub ログイン
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col items-center py-10 text-center sm:py-16">
      <div className="boss-float text-8xl sm:text-9xl" aria-hidden>
        🐉
      </div>

      <h1 className="mt-6 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-rose-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
        RaidCoder
      </h1>
      <p className="mt-3 max-w-xl text-base text-slate-300 sm:text-lg">
        AI が毎週生成するレイドボスを、
        <span className="font-bold text-rose-300">みんなの AC</span>
        で討伐する協力型・競技プログラミングゲーム。
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
        {[
          ["🗡️", "毎週月曜、ランク S〜E の6問とボスが出現"],
          ["💥", "AC するとランク・速度・先制に応じたダメージ"],
          ["🏆", "週間ダメージで順位が付き、レーティングが変動"],
          ["🤝", "掲示板でアイデア相談 OK。解説は週終了後に公開"],
        ].map(([emoji, text]) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3"
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-sm text-slate-300">{text}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
          認証に失敗しました。もう一度お試しください。
        </p>
      )}

      <div className="mt-10">
        <LoginButton />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        参戦には GitHub アカウントが必要です
      </p>
    </div>
  );
}
