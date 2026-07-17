"use client";

import { useEffect, useRef, useState } from "react";
import type { GameCharacter } from "@/lib/characters";

// キャラクターの表示コンポーネント。絵文字によるキャラクター表現は禁止(CLAUDE.md)。
// /characters/<slug>.png(512×512・背景透過)があれば表示し、
// 生成前はキャラクターのアクセントカラーを使ったモノグラムを表示する。
export function BossAvatar({
  character,
  size = 96,
  defeated = false,
  className = "",
}: {
  character: GameCharacter;
  size?: number;
  defeated?: boolean;
  className?: string;
}) {
  const [imageMissing, setImageMissing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // SSR 直後(ハイドレーション前)に読み込み失敗した画像は onError が
  // 発火しないため、マウント時に complete && naturalWidth===0 で検出する
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImageMissing(true);
    }
  }, []);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-secondary ${defeated ? "opacity-50 grayscale" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: `inset 0 0 0 2px ${character.accent}55`,
      }}
      role="img"
      aria-label={character.name}
    >
      {imageMissing ? (
        <div className="flex h-full w-full items-center justify-center">
          <span
            className="select-none font-black"
            style={{ color: character.accent, fontSize: size * 0.42 }}
            aria-hidden
          >
            {character.name.charAt(0)}
          </span>
        </div>
      ) : (
        // 静的アセットのため next/image は使わず、未配置時は onError でフォールバック
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={`/characters/${character.slug}.png`}
          alt=""
          width={size}
          height={size}
          // 全身スプライトを円内に収める(cover だと横長・縦長の個体が切れる)
          className="h-full w-full object-contain p-[6%]"
          onError={() => setImageMissing(true)}
        />
      )}
    </div>
  );
}
