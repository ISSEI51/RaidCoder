// Supabase(service role)クライアントと RPC / クエリのラッパー
// RPC 名・引数名・テーブル/列名は CONTRACT §8 と 0001_init.sql が正。

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AggregatedResult } from './aggregate.js';
import type { ProblemLimits, SubmissionRow, TestCaseRow } from './types.js';

export function createServiceClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** pending の提出を原子的にクレームして running にする(CONTRACT §8) */
export async function claimPendingSubmissions(
  client: SupabaseClient,
  limit: number,
): Promise<SubmissionRow[]> {
  const { data, error } = await client.rpc('claim_pending_submissions', { p_limit: limit });
  if (error) {
    throw new Error(`claim_pending_submissions に失敗: ${error.message}`);
  }
  return (data ?? []) as SubmissionRow[];
}

/** problems から実行制限(time_limit_ms / memory_limit_kb)を取得する */
export async function fetchProblemLimits(
  client: SupabaseClient,
  problemId: string,
): Promise<ProblemLimits> {
  const { data, error } = await client
    .from('problems')
    .select('time_limit_ms, memory_limit_kb')
    .eq('id', problemId)
    .single();
  if (error) {
    throw new Error(`problems の取得に失敗 (${problemId}): ${error.message}`);
  }
  return data as ProblemLimits;
}

/** test_cases を全件取得する(service role なので非サンプルも含む) */
export async function fetchTestCases(
  client: SupabaseClient,
  problemId: string,
): Promise<TestCaseRow[]> {
  const { data, error } = await client
    .from('test_cases')
    .select('id, name, input, expected_output, is_sample')
    .eq('problem_id', problemId)
    .order('name', { ascending: true });
  if (error) {
    throw new Error(`test_cases の取得に失敗 (${problemId}): ${error.message}`);
  }
  return (data ?? []) as TestCaseRow[];
}

/** apply_submission_result RPC の戻り値(jsonb) */
export interface ApplyResult {
  applied: boolean;
  status?: string;
  damage?: number;
  first_blood?: boolean;
  reason?: string;
}

/** 判定確定: ダメージ計算・ボスHP減算・EXP 付与は DB 関数内で原子的に行われる */
export async function applySubmissionResult(
  client: SupabaseClient,
  submissionId: string,
  result: AggregatedResult,
): Promise<ApplyResult> {
  const { data, error } = await client.rpc('apply_submission_result', {
    p_submission_id: submissionId,
    p_status: result.status,
    p_passed_count: result.passedCount,
    p_total_count: result.totalCount,
    p_exec_time_ms: result.execTimeMs,
    p_memory_kb: result.memoryKb,
  });
  if (error) {
    throw new Error(`apply_submission_result に失敗 (${submissionId}): ${error.message}`);
  }
  return data as ApplyResult;
}
