// 共通の型定義(CONTRACT §1, §2 に対応)

/** 対応言語(submissions.language / CONTRACT §1) */
export type Language = 'python' | 'rust' | 'typescript' | 'java';

/** 終端ステータス(CONTRACT §2) */
export type SubmissionStatus = 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | 'IE';

/** テストケース単体の判定ステータス(集約前) */
export type CaseStatus = SubmissionStatus;

/** claim_pending_submissions RPC が返す submissions 行(必要な列のみ) */
export interface SubmissionRow {
  id: string;
  problem_id: string;
  user_id: string;
  language: Language;
  code: string;
  status: string;
  created_at: string;
}

/** problems から取得する実行制限 */
export interface ProblemLimits {
  time_limit_ms: number;
  memory_limit_kb: number;
  /**
   * LeetCode 形式の問題では言語 → ジャッジ用ハーネス。
   * null の場合は旧形式(stdin/stdout)で、提出コードを単体で実行する。
   */
  judge_harnesses: Record<string, string> | null;
}

/** test_cases 行(service role なので非サンプルも取得できる) */
export interface TestCaseRow {
  id: string;
  name: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
}
