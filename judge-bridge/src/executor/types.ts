// Executor 抽象化: Judge0(本番)と LocalUnsafe(開発)を差し替え可能にする

import type { CaseStatus, Language } from '../types.js';

/** 実行対象のテストケース(期待出力は Executor 内の自前比較でのみ使用する) */
export interface RunCase {
  input: string;
  expectedOutput: string;
}

/** 1提出分の実行パラメータ */
export interface RunParams {
  language: Language;
  code: string;
  cases: RunCase[];
  /** problems.time_limit_ms */
  timeLimitMs: number;
  /** problems.memory_limit_kb */
  memoryLimitKb: number;
}

/** テストケース1件ぶんの実行結果 */
export interface CaseResult {
  status: CaseStatus;
  execTimeMs: number | null;
  memoryKb: number | null;
}

/** コード実行エンジンの共通インターフェース */
export interface Executor {
  /** 全ケースを実行し、cases と同じ順序で結果を返す */
  run(params: RunParams): Promise<CaseResult[]>;
}
