// テストケース結果 → 提出ステータスへの集約(CONTRACT §2)
//   - 1件でも CE → CE
//   - それ以外は優先度 IE > RE > TLE > WA で最悪のものを採用
//   - 全ケース AC のみ AC
//   - passed_count = AC だったケース数、exec_time_ms / memory_kb = 全ケースの最大値

import type { CaseResult } from './executor/types.js';
import type { SubmissionStatus } from './types.js';

/** apply_submission_result RPC へ渡す集約結果 */
export interface AggregatedResult {
  status: SubmissionStatus;
  passedCount: number;
  totalCount: number;
  execTimeMs: number | null;
  memoryKb: number | null;
}

/** CE を除いた「最悪値」の優先順(先頭ほど悪い) */
const WORST_ORDER: readonly SubmissionStatus[] = ['IE', 'RE', 'TLE', 'WA'];

function maxOrNull(values: readonly (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  return nums.length > 0 ? Math.max(...nums) : null;
}

export function aggregate(results: readonly CaseResult[]): AggregatedResult {
  const totalCount = results.length;
  const passedCount = results.filter((r) => r.status === 'AC').length;

  let status: SubmissionStatus;
  if (totalCount === 0) {
    // ケースが1件もないのは異常事態(内部エラー扱い)
    status = 'IE';
  } else if (results.some((r) => r.status === 'CE')) {
    status = 'CE';
  } else if (passedCount === totalCount) {
    status = 'AC';
  } else {
    status = WORST_ORDER.find((s) => results.some((r) => r.status === s)) ?? 'IE';
  }

  return {
    status,
    passedCount,
    totalCount,
    execTimeMs: maxOrNull(results.map((r) => r.execTimeMs)),
    memoryKb: maxOrNull(results.map((r) => r.memoryKb)),
  };
}
