// CONTRACT.md で定義された定数(勝手に変えないこと)

/** 問題ランク(難しい順) */
export const RANKS = ['S', 'A', 'B', 'C', 'D', 'E'] as const;
export type Rank = (typeof RANKS)[number];

/** 基礎ダメージ (CONTRACT §3) */
export const BASE_DAMAGE: Record<Rank, number> = {
  E: 500,
  D: 1000,
  C: 2000,
  B: 3500,
  A: 5500,
  S: 8500,
};

/** ボスHP係数: boss_max_hp = 20000 × count_active_players() (CONTRACT §4) */
export const HP_PER_PLAYER = 20000;

/** Judge0 CE の Python 3.8 言語ID (CONTRACT §1) */
export const JUDGE0_PYTHON_LANGUAGE_ID = 71;

/** 隠しテストケースの seed (1〜10 の10件) */
export const HIDDEN_CASE_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** 問題ごとの生成リトライ回数上限 */
export const MAX_PROBLEM_ATTEMPTS = 3;

/** 週テーマ生成のリトライ回数上限 */
export const MAX_THEME_ATTEMPTS = 3;

/** メモリ制限 (KB)。problems.memory_limit_kb の DB デフォルトと同値 */
export const DEFAULT_MEMORY_LIMIT_KB = 262144;

/** ケースジェネレータ実行時の時間制限 (ms)。解答より緩くする */
export const GENERATOR_TIME_LIMIT_MS = 10000;
