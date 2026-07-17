// キャラクターロースター(docs/design_policy.md「キャラクター」章)
// 画像は Replicate MCP で生成し web/public/characters/<slug>.png に配置する
// (512×512・胸上ポートレート・背景透過)。未配置の間は BossAvatar が
// モノグラムのフォールバックを表示する。
// accent はキャラクターごとのアクセントカラー1色(ドメインデータの可視化であり
// UI の4系統カラー制限の対象外 — CLAUDE.md 参照)

export interface GameCharacter {
  slug: string;
  name: string;
  /** 競プロ的モチーフ */
  motif: string;
  /** キャラクター固有のアクセントカラー(1色) */
  accent: string;
}

export const CHARACTERS: GameCharacter[] = [
  { slug: "pathfinder", name: "Pathfinder", motif: "グラフ探索・迷路", accent: "#38bdf8" },
  { slug: "architect", name: "Architect", motif: "動的計画法・設計", accent: "#a78bfa" },
  { slug: "hacker", name: "Hacker", motif: "ビット演算・XOR", accent: "#34d399" },
  { slug: "sentinel", name: "Sentinel", motif: "セキュリティ・検証", accent: "#f59e0b" },
  { slug: "speedrunner", name: "Speedrunner", motif: "貪欲法・高速実装", accent: "#f472b6" },
  { slug: "oracle", name: "Oracle", motif: "数学・確率", accent: "#818cf8" },
  { slug: "debugger", name: "Debugger", motif: "バグ発見・テスト", accent: "#fb7185" },
  { slug: "commander", name: "Commander", motif: "チーム戦・レーティング", accent: "#facc15" },
];

/** 週番号からその週のボスキャラクターを決定的に選ぶ(旧 BOSS_EMOJI の置き換え) */
export function characterForWeek(weekNumber: number): GameCharacter {
  return CHARACTERS[Math.abs(weekNumber) % CHARACTERS.length];
}
