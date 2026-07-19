// judge-bridge エントリポイント
// POLL_INTERVAL_MS ごとに claim_pending_submissions RPC で提出をクレームし、
// Executor(Judge0 / Local)で実行 → 集約 → apply_submission_result で確定する常駐ワーカー。

import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { aggregate } from './aggregate.js';
import { loadConfig } from './config.js';
import { Judge0Executor } from './executor/judge0.js';
import { LocalUnsafeExecutor } from './executor/local.js';
import type { Executor } from './executor/types.js';
import { log } from './logger.js';
import {
  applySubmissionResult,
  claimPendingSubmissions,
  createServiceClient,
  fetchProblemLimits,
  fetchTestCases,
} from './supabase.js';
import type { SubmissionRow } from './types.js';

// .env があれば読み込む(Node 標準機能。既存の環境変数は上書きしない)
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const config = loadConfig();
const client = createServiceClient(config.supabaseUrl, config.supabaseServiceRoleKey);
const executor: Executor =
  config.executor === 'local'
    ? new LocalUnsafeExecutor()
    : new Judge0Executor(config.judge0Url, config.judge0AuthToken);

/** 同時に処理する提出は最大2件 */
const MAX_CONCURRENCY = 2;
/**
 * graceful shutdown 時に処理中の提出を待つ上限。
 * ジャッジ1件は Judge0 のポーリング上限だけで最大約90秒かかるため、それを覆う長さにする。
 * infra/docker-compose.yml の stop_grace_period(120s)より短く保つこと(超えると SIGKILL される)。
 */
const SHUTDOWN_GRACE_MS = 110_000;

let inFlight = 0;
let shuttingDown = false;

/** 提出1件を処理する。例外時は該当提出を IE で確定させ、ワーカー自体は落とさない。 */
async function processSubmission(sub: SubmissionRow): Promise<void> {
  const started = performance.now();
  try {
    const limits = await fetchProblemLimits(client, sub.problem_id);
    const cases = await fetchTestCases(client, sub.problem_id);
    if (cases.length === 0) {
      throw new Error(`テストケースが0件です (problem_id=${sub.problem_id})`);
    }

    // LeetCode 形式: 提出コード(関数実装)の末尾にジャッジ用ハーネスを連結して実行する。
    // ハーネスが無い問題(旧 AtCoder 形式)は提出コードをそのまま実行する。
    const harness = limits.judge_harnesses?.[sub.language];
    const code = harness ? `${sub.code}\n${harness}` : sub.code;

    const results = await executor.run({
      language: sub.language,
      code,
      cases: cases.map((c) => ({ input: c.input, expectedOutput: c.expected_output })),
      timeLimitMs: limits.time_limit_ms,
      memoryLimitKb: limits.memory_limit_kb,
    });

    const aggregated = aggregate(results);
    const applied = await applySubmissionResult(client, sub.id, aggregated);

    log('info', '判定完了', {
      submission_id: sub.id,
      language: sub.language,
      status: aggregated.status,
      passed: `${aggregated.passedCount}/${aggregated.totalCount}`,
      damage: applied.damage ?? 0,
      first_blood: applied.first_blood ?? false,
      applied: applied.applied,
      duration_ms: Math.round(performance.now() - started),
    });
  } catch (err) {
    log('error', '判定処理中に例外が発生。この提出は IE で確定します', {
      submission_id: sub.id,
      error: err instanceof Error ? err.message : String(err),
      duration_ms: Math.round(performance.now() - started),
    });
    try {
      await applySubmissionResult(client, sub.id, {
        status: 'IE',
        passedCount: 0,
        totalCount: 0,
        execTimeMs: null,
        memoryKb: null,
      });
    } catch (applyErr) {
      log('error', 'IE での確定にも失敗しました', {
        submission_id: sub.id,
        error: applyErr instanceof Error ? applyErr.message : String(applyErr),
      });
    }
  }
}

/** 空きスロットぶんだけ pending をクレームし、非同期で処理を開始する */
async function tick(): Promise<void> {
  const slots = MAX_CONCURRENCY - inFlight;
  if (slots <= 0) return;

  let claimed: SubmissionRow[];
  try {
    claimed = await claimPendingSubmissions(client, slots);
  } catch (err) {
    log('error', '提出のクレームに失敗しました', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  for (const sub of claimed) {
    inFlight += 1;
    log('info', '提出をクレームしました', { submission_id: sub.id, language: sub.language });
    void processSubmission(sub).finally(() => {
      inFlight -= 1;
    });
  }
}

async function main(): Promise<void> {
  log('info', 'judge-bridge を起動しました', {
    executor: config.executor,
    poll_interval_ms: config.pollIntervalMs,
    max_concurrency: MAX_CONCURRENCY,
  });
  if (config.executor === 'local') {
    log('warn', 'EXECUTOR=local はサンドボックスなしの開発専用モードです。信頼できるコード以外を実行しないでください');
  }

  while (!shuttingDown) {
    await tick();
    await sleep(config.pollIntervalMs);
  }

  // graceful shutdown: 処理中の提出が終わるまで(上限つきで)待つ
  const deadline = Date.now() + SHUTDOWN_GRACE_MS;
  while (inFlight > 0 && Date.now() < deadline) {
    await sleep(200);
  }
  if (inFlight > 0) {
    log('warn', '処理中の提出が残ったまま停止します(running のまま残った提出は claim_pending_submissions の stale 回収により5分後に自動で再ジャッジされます)', {
      in_flight: inFlight,
    });
  }
  log('info', 'judge-bridge を停止しました');
  process.exit(0);
}

function requestShutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', `${signal} を受信しました。新規クレームを止め、処理中の提出を待って停止します`, {
    in_flight: inFlight,
  });
}

process.on('SIGTERM', () => requestShutdown('SIGTERM'));
process.on('SIGINT', () => requestShutdown('SIGINT'));

main().catch((err) => {
  log('error', 'ワーカーが致命的なエラーで停止しました', {
    error: err instanceof Error ? (err.stack ?? err.message) : String(err),
  });
  process.exit(1);
});
