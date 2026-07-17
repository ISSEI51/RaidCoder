"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RaidWeek } from "@/lib/database.types";
import { Countdown } from "@/components/Countdown";
import { formatDateTimeJst, formatInt } from "@/lib/format";

const BOSS_EMOJI = ["🐉", "👹", "💀", "🦖", "🐲", "🧟", "🤖", "👾", "🦑", "😈"];

// レイドボスパネル: Supabase Realtime (postgres_changes) で raid_weeks の
// UPDATE を購読し、HP バーがライブで減る。
export function BossPanel({ week: initialWeek }: { week: RaidWeek }) {
  const [week, setWeek] = useState(initialWeek);
  const [hit, setHit] = useState<{ amount: number; id: number } | null>(null);
  const prevHpRef = useRef(initialWeek.boss_hp);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`raid-week-${initialWeek.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "raid_weeks",
          filter: `id=eq.${initialWeek.id}`,
        },
        (payload) => {
          const next = payload.new as RaidWeek;
          if (
            typeof next.boss_hp === "number" &&
            next.boss_hp < prevHpRef.current
          ) {
            setHit({ amount: prevHpRef.current - next.boss_hp, id: Date.now() });
          }
          prevHpRef.current = next.boss_hp;
          setWeek(next);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, initialWeek.id]);

  // 速度倍率のプレビュー(確定値は DB の apply_submission_result が計算)。
  // SSR とのハイドレーション不一致を避けるため、マウント後にのみ算出する。
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const speedMultiplier = useMemo(() => {
    if (now === null) return null;
    const start = new Date(week.starts_at).getTime();
    const end = new Date(week.ends_at).getTime();
    if (!(end > start)) return null;
    const elapsed = Math.min(Math.max((now - start) / (end - start), 0), 1);
    return 1 + 0.3 * (1 - elapsed);
  }, [now, week.starts_at, week.ends_at]);

  const defeated = week.defeated_at !== null || week.boss_hp <= 0;
  const hpPercent = Math.max(
    0,
    Math.min(100, (week.boss_hp / week.boss_max_hp) * 100),
  );
  const emoji = BOSS_EMOJI[Math.abs(week.week_number) % BOSS_EMOJI.length];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-purple-900/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 shadow-2xl sm:p-8">
      {/* 背景の禍々しいオーラ */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: defeated
            ? "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(250,204,21,0.18), transparent)"
            : "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(168,85,247,0.18), transparent)",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between text-xs font-bold tracking-widest text-purple-300/80">
          <span>WEEK {week.week_number} — RAID BOSS</span>
          <span className="hidden sm:inline">
            {formatDateTimeJst(week.starts_at)} 〜 {formatDateTimeJst(week.ends_at)}
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div
            className={`text-7xl sm:text-8xl ${defeated ? "opacity-40 grayscale" : "boss-float"}`}
            aria-hidden
          >
            {defeated ? "☠️" : emoji}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-black tracking-wide text-slate-50 sm:text-3xl">
              {week.boss_name}
            </h1>
            {week.boss_flavor && (
              <p className="mt-1 text-sm italic text-slate-400">
                「{week.boss_flavor}」
              </p>
            )}

            {/* HP バー */}
            <div className={`mt-4 ${hit ? "hp-shake" : ""}`} key={hit?.id ?? "bar"}>
              <div className="mb-1 flex items-end justify-between text-sm">
                <span className="font-bold tracking-widest text-rose-300">HP</span>
                <span className="font-mono tabular-nums text-slate-300">
                  {formatInt(week.boss_hp)}{" "}
                  <span className="text-slate-500">/ {formatInt(week.boss_max_hp)}</span>
                </span>
              </div>
              <div className="relative h-6 overflow-hidden rounded-full border border-rose-900/60 bg-slate-950/80 shadow-inner">
                <div
                  className="hp-fill h-full rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-orange-500"
                  style={{
                    width: `${hpPercent}%`,
                    boxShadow: "0 0 16px rgba(244,63,94,0.55)",
                  }}
                />
                {/* ダメージフロート */}
                {hit && (
                  <div
                    key={hit.id}
                    className="damage-float pointer-events-none absolute inset-x-0 -top-1 text-center text-xl font-black text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]"
                    onAnimationEnd={() => setHit(null)}
                  >
                    -{formatInt(hit.amount)}
                  </div>
                )}
              </div>
              <div className="mt-1 text-right text-xs text-slate-500">
                {hpPercent.toFixed(1)}%
              </div>
            </div>

            {/* 勝利 or カウントダウン */}
            {defeated ? (
              <div className="mt-4 rounded-xl border border-yellow-600/50 bg-yellow-500/10 p-4 text-center">
                <div className="victory-glow text-2xl font-black tracking-widest text-yellow-300">
                  🎉 VICTORY! ボス撃破!! 🎉
                </div>
                <p className="mt-1 text-sm text-yellow-200/80">
                  {week.defeated_at
                    ? `${formatDateTimeJst(week.defeated_at)} に討伐完了。週終了時に参加者全員へ +2000 EXP!`
                    : "討伐完了。週終了時に参加者全員へ +2000 EXP!"}
                </p>
                {week.status === "active" && (
                  <p className="mt-1 text-xs text-yellow-200/60">
                    残りの問題も AC すればランキングのダメージには全額計上されます(オーバーキル)
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3">
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <span className="text-sm text-slate-400">⏳ 週終了まで</span>
                  <Countdown endsAt={week.ends_at} />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400 sm:justify-start">
                  {speedMultiplier !== null && (
                    <span>
                      ⚡ 今 AC すると速度倍率{" "}
                      <span className="font-bold text-amber-300">
                        ×{speedMultiplier.toFixed(2)}
                      </span>
                      (週序盤ほど高ダメージ)
                    </span>
                  )}
                  <span>
                    🏆 週末までに HP 0 なら参加者全員に{" "}
                    <span className="font-bold text-yellow-300">+2000 EXP</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
