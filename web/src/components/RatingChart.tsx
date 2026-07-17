import { RATING_TIERS, ratingHex } from "@/lib/rating";

type ChartEvent = {
  week_number: number;
  rating_before: number;
  rating_after: number;
};

// レート推移の折れ線グラフ(SVG手描き。背景に色帯 = CONTRACT §5 のしきい値)
// 色帯・点のレート色はドメインデータの可視化として維持し、線・軸はトークン色を使う。
export function RatingChart({ events }: { events: ChartEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        まだレート変動がありません。レイドに参加してダメージを与えよう!
      </p>
    );
  }

  const sorted = [...events].sort((a, b) => a.week_number - b.week_number);
  const points: { label: string; rating: number }[] = [
    { label: "開始", rating: sorted[0].rating_before },
    ...sorted.map((e) => ({ label: `W${e.week_number}`, rating: e.rating_after })),
  ];

  const W = 640;
  const H = 260;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 32;

  const ratings = points.map((p) => p.rating);
  const rawMin = Math.min(...ratings);
  const rawMax = Math.max(...ratings);
  const yMin = Math.floor((rawMin - 80) / 100) * 100;
  const yMax = Math.ceil((rawMax + 80) / 100) * 100;

  const x = (i: number) =>
    PAD_L +
    (points.length === 1
      ? (W - PAD_L - PAD_R) / 2
      : ((W - PAD_L - PAD_R) * i) / (points.length - 1));
  const y = (r: number) =>
    PAD_T + ((H - PAD_T - PAD_B) * (yMax - r)) / (yMax - yMin || 1);

  // 色帯(しきい値バンド)
  const bands: { from: number; to: number; hex: string }[] = [];
  const thresholds = [...RATING_TIERS].reverse(); // 低い順
  for (let i = 0; i < thresholds.length; i++) {
    const lo = i === 0 ? Number.NEGATIVE_INFINITY : thresholds[i].min;
    const hi = i === thresholds.length - 1 ? Number.POSITIVE_INFINITY : thresholds[i + 1].min;
    const from = Math.max(lo, yMin);
    const to = Math.min(hi, yMax);
    if (from < to) bands.push({ from, to, hex: thresholds[i].hex });
  }

  const gridLines: number[] = [];
  for (let v = yMin; v <= yMax; v += 100) gridLines.push(v);

  const polyline = points.map((p, i) => `${x(i)},${y(p.rating)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[480px]"
        role="img"
        aria-label="レート推移グラフ"
      >
        {/* 色帯 */}
        {bands.map((b, i) => (
          <rect
            key={i}
            x={PAD_L}
            width={W - PAD_L - PAD_R}
            y={y(b.to)}
            height={Math.max(0, y(b.from) - y(b.to))}
            fill={b.hex}
            opacity={0.09}
          />
        ))}

        {/* グリッド + Y軸ラベル */}
        {gridLines.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeWidth={v % 400 === 0 ? 1 : 0.5}
              strokeDasharray="4 4"
            />
            <text
              x={PAD_L - 6}
              y={y(v) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {v}
            </text>
          </g>
        ))}

        {/* 折れ線 */}
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 各点(レート色) + X軸ラベル */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(p.rating)}
              r={4.5}
              fill={ratingHex(p.rating)}
              stroke="var(--background)"
              strokeWidth={1.5}
            />
            <text
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
