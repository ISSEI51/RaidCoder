"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// 週終了までのカウントダウン(1秒ごとに更新)。等幅数字で桁の揺れを防ぐ。
export function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // マウント前は SSR とのハイドレーション不一致を避けるためプレースホルダを出す
  if (now === null) {
    return (
      <span className="font-mono text-lg font-bold tabular-nums text-muted-foreground">
        --:--:--
      </span>
    );
  }

  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) {
    return (
      <span className="text-sm font-bold text-muted-foreground">
        週は終了しました
      </span>
    );
  }

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const urgent = diff < 24 * 3600 * 1000;

  return (
    <span
      className={`font-mono text-lg font-bold tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}
    >
      {days > 0 && <span>{days}日 </span>}
      {pad(hours)}:{pad(mins)}:{pad(secs)}
    </span>
  );
}
