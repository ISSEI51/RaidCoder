"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Hourglass, Trophy, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RaidWeek } from "@/lib/database.types";
import { Countdown } from "@/components/Countdown";
import { BossAvatar } from "@/components/BossAvatar";
import { characterForWeek } from "@/lib/characters";
import { formatDateTimeJst, formatInt } from "@/lib/format";

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
  const character = characterForWeek(week.week_number);

  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-bold tracking-widest">
          WEEK {week.week_number} — RAID BOSS
        </span>
        <span className="hidden tabular-nums sm:inline">
          {formatDateTimeJst(week.starts_at)} 〜 {formatDateTimeJst(week.ends_at)}
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* ボスキャラクターポートレート(絵文字ボスの置き換え) */}
        <BossAvatar character={character} size={128} defeated={defeated} />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">
            {week.boss_name}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {character.name} / {character.motif}
          </p>
          {week.boss_flavor && (
            <p className="mt-1 text-sm italic text-muted-foreground">
              「{week.boss_flavor}」
            </p>
          )}

          {/* HP バー */}
          <div className={`mt-4 ${hit ? "hp-shake" : ""}`} key={hit?.id ?? "bar"}>
            <div className="mb-1 flex items-end justify-between text-sm">
              <span className="font-bold tracking-widest text-destructive">
                HP
              </span>
              <span className="font-mono tabular-nums text-foreground">
                {formatInt(week.boss_hp)}{" "}
                <span className="text-muted-foreground">
                  / {formatInt(week.boss_max_hp)}
                </span>
              </span>
            </div>
            <div className="relative h-5 overflow-hidden rounded-md border border-border bg-background">
              <div
                className="hp-fill h-full bg-destructive"
                style={{ width: `${hpPercent}%` }}
              />
              {/* ダメージフロート */}
              {hit && (
                <div
                  key={hit.id}
                  className="damage-float pointer-events-none absolute inset-x-0 -top-0.5 text-center text-lg font-black tabular-nums text-foreground"
                  onAnimationEnd={() => setHit(null)}
                >
                  -{formatInt(hit.amount)}
                </div>
              )}
            </div>
            <div className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
              {hpPercent.toFixed(1)}%
            </div>
          </div>

          {/* 勝利 or カウントダウン */}
          {defeated ? (
            <div className="mt-4 rounded-lg border border-border bg-secondary/50 p-4 text-center">
              <div className="victory-glow inline-flex items-center gap-2 text-xl font-black tracking-widest">
                <Trophy className="size-5" aria-hidden />
                VICTORY — ボス撃破
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {week.defeated_at
                  ? `${formatDateTimeJst(week.defeated_at)} に討伐完了。週終了時に参加者全員へ +2000 EXP!`
                  : "討伐完了。週終了時に参加者全員へ +2000 EXP!"}
              </p>
              {week.status === "active" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  残りの問題も AC すればランキングのダメージには全額計上されます(オーバーキル)
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <Hourglass className="size-4 text-muted-foreground" aria-hidden />
                <span className="text-sm text-muted-foreground">週終了まで</span>
                <Countdown endsAt={week.ends_at} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-start">
                {speedMultiplier !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Zap className="size-3 shrink-0" aria-hidden />
                    <span>
                      今 AC すると速度倍率{" "}
                      <span className="font-bold tabular-nums text-primary">
                        ×{speedMultiplier.toFixed(2)}
                      </span>
                      (週序盤ほど高ダメージ)
                    </span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Trophy className="size-3 shrink-0" aria-hidden />
                  <span>
                    週末までに HP 0 なら参加者全員に{" "}
                    <span className="font-bold text-foreground">+2000 EXP</span>
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
