// 週替わりボスキャラクター(web/src/lib/characters.ts と同一の順序・割り当てを保つこと)
// 画像・世界観の正は docs/design/character_art_direction.md。
// characterForWeek の index 計算も web 側 (Math.abs(weekNumber) % 8) と一致させる。

export interface BossCharacter {
  /** web 側と共通のスラッグ(画像ファイル名) */
  slug: string;
  /** 役割名(Pathfinder 等) */
  role: string;
  /** モチーフの開発ツール */
  tool: string;
  /** モンスターとしての姿(プロンプト用の説明) */
  creature: string;
  /** 得意分野(参考情報) */
  motif: string;
}

export const BOSS_CHARACTERS: BossCharacter[] = [
  { slug: 'pathfinder', role: 'Pathfinder', tool: 'Git', creature: '触手がコミットグラフのように分岐する大ダコ', motif: 'グラフ探索・迷路' },
  { slug: 'architect', role: 'Architect', tool: 'Docker', creature: '背中に発光コンテナの都市を積んだ装甲クジラ', motif: '動的計画法・設計' },
  { slug: 'hacker', role: 'Hacker', tool: 'Python', creature: '鱗が0/1のバイナリ紋様の双頭大蛇', motif: 'ビット演算・XOR' },
  { slug: 'sentinel', role: 'Sentinel', tool: 'Rust', creature: '錆色の重装甲をまとい盾のような鋏を構える巨大ガニ', motif: 'セキュリティ・検証' },
  { slug: 'speedrunner', role: 'Speedrunner', tool: 'Swift', creature: '桃色の残像を引いて疾走する狐獣', motif: '貪欲法・高速実装' },
  { slug: 'oracle', role: 'Oracle', tool: 'PostgreSQL', creature: '第三の目を持ちDBテーブルの刻印をまとう賢者ゾウ', motif: '数学・確率' },
  { slug: 'debugger', role: 'Debugger', tool: 'デバッガ(世界初のバグの蛾)', creature: '回路基板模様の翅を持つ巨大蛾', motif: 'バグ発見・テスト' },
  { slug: 'commander', role: 'Commander', tool: 'Linux', creature: '金装甲とマントをまとった皇帝ペンギンの武将', motif: 'チーム戦・レーティング' },
];

/** 週番号 → キャラクター(web/src/lib/characters.ts の characterForWeek と同一ロジック) */
export function characterForWeek(weekNumber: number): BossCharacter {
  return BOSS_CHARACTERS[Math.abs(weekNumber) % BOSS_CHARACTERS.length]!;
}
