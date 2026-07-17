// Judge0Executor(既定の実行エンジン)
// - POST {JUDGE0_URL}/submissions/batch?base64_encoded=true でバッチ提出(X-Auth-Token 必須)
// - GET  {JUDGE0_URL}/submissions/batch?tokens=...&base64_encoded=true&fields=... で完了までポーリング
// - 出力比較は自前(compareOutput)。Judge0 へ expected_output は送らない。

import { Buffer } from 'node:buffer';
import { setTimeout as sleep } from 'node:timers/promises';
import { compareOutput } from '../compare.js';
import { log } from '../logger.js';
import type { CaseStatus, Language } from '../types.js';
import type { CaseResult, Executor, RunCase, RunParams } from './types.js';

/** CONTRACT §1: Judge0 CE の言語ID */
export const JUDGE0_LANGUAGE_IDS: Record<Language, number> = {
  python: 71, // Python 3.8
  rust: 73, // Rust 1.40
  typescript: 74, // TypeScript 3.7
  java: 62, // Java (OpenJDK 13)
};

/** 1バッチあたりの提出数(Judge0 の既定上限 20 に合わせる) */
const BATCH_SIZE = 20;
/** 結果ポーリング間隔(1秒) */
const RESULT_POLL_INTERVAL_MS = 1_000;
/** ポーリング回数の上限(超過した未完了ケースは IE 扱い) */
const MAX_POLL_ATTEMPTS = 90;
/** 結果取得時に要求するフィールド */
const RESULT_FIELDS = 'token,status_id,stdout,time,memory';

interface Judge0Result {
  token?: string;
  status_id?: number | null;
  status?: { id?: number } | null;
  stdout?: string | null;
  /** 実行時間(秒、文字列。例 "0.012") */
  time?: string | null;
  /** メモリ使用量(KB) */
  memory?: number | null;
}

function toBase64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

function fromBase64(text: string): string {
  return Buffer.from(text, 'base64').toString('utf8');
}

export class Judge0Executor implements Executor {
  constructor(
    private readonly baseUrl: string,
    private readonly authToken: string,
  ) {}

  async run(params: RunParams): Promise<CaseResult[]> {
    // 1) 全ケースをバッチ提出してトークンを集める(cases と同じ順序)
    const tokens: string[] = [];
    for (let i = 0; i < params.cases.length; i += BATCH_SIZE) {
      const chunk = params.cases.slice(i, i + BATCH_SIZE);
      tokens.push(...(await this.submitBatch(params, chunk)));
    }

    // 2) 全件完了までポーリング
    const resultByToken = await this.pollResults(tokens);

    // 3) ステータスをマッピングし、成功ケースは自前比較で AC/WA を判定
    return params.cases.map((c, i) =>
      this.toCaseResult(resultByToken.get(tokens[i]), c.expectedOutput),
    );
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Auth-Token': this.authToken,
    };
  }

  private async submitBatch(params: RunParams, cases: RunCase[]): Promise<string[]> {
    const body = {
      submissions: cases.map((c) => ({
        language_id: JUDGE0_LANGUAGE_IDS[params.language],
        // マルチバイト対策のため base64 で送る(CONTRACT §1)
        source_code: toBase64(params.code),
        stdin: toBase64(c.input),
        // CONTRACT §1: cpu_time_limit = time_limit_ms / 1000(秒)、memory_limit = memory_limit_kb
        cpu_time_limit: params.timeLimitMs / 1000,
        memory_limit: params.memoryLimitKb,
      })),
    };
    const res = await fetch(`${this.baseUrl}/submissions/batch?base64_encoded=true`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Judge0 バッチ提出に失敗: HTTP ${res.status} ${text}`);
    }
    const created = (await res.json()) as { token?: string }[];
    if (!Array.isArray(created) || created.length !== cases.length) {
      throw new Error('Judge0 バッチ提出のレスポンス形式が不正です');
    }
    return created.map((entry, i) => {
      if (!entry?.token) {
        throw new Error(`Judge0 がトークンを返しませんでした (case ${i}): ${JSON.stringify(entry)}`);
      }
      return entry.token;
    });
  }

  /** 全トークンの実行完了(status_id >= 3)を1秒間隔・上限つきで待つ */
  private async pollResults(tokens: string[]): Promise<Map<string, Judge0Result>> {
    const done = new Map<string, Judge0Result>();
    let pending = [...tokens];

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS && pending.length > 0; attempt++) {
      await sleep(RESULT_POLL_INTERVAL_MS);
      const stillPending: string[] = [];
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const chunk = pending.slice(i, i + BATCH_SIZE);
        const url =
          `${this.baseUrl}/submissions/batch` +
          `?tokens=${chunk.join(',')}&base64_encoded=true&fields=${RESULT_FIELDS}`;
        const res = await fetch(url, { headers: this.headers() });
        if (!res.ok) {
          throw new Error(`Judge0 結果取得に失敗: HTTP ${res.status}`);
        }
        const payload = (await res.json()) as { submissions?: (Judge0Result | null)[] };
        const rows = payload.submissions ?? [];
        chunk.forEach((token, j) => {
          const row = rows[j];
          const statusId = row?.status_id ?? row?.status?.id;
          // 1=In Queue, 2=Processing は未完了。3以上で確定。
          if (row && statusId != null && statusId >= 3) {
            done.set(token, row);
          } else {
            stillPending.push(token);
          }
        });
      }
      pending = stillPending;
    }

    if (pending.length > 0) {
      log('warn', 'Judge0 のポーリング上限に達しました。未完了ケースは IE 扱いにします', {
        pending_count: pending.length,
        max_attempts: MAX_POLL_ATTEMPTS,
      });
    }
    return done;
  }

  /**
   * Judge0 status のマッピング(仕様):
   *   3 = 実行成功 → 自前比較で AC/WA を判定
   *   5 = TLE / 6 = CE / 7〜12 = RE / 13,14 = IE
   */
  private toCaseResult(result: Judge0Result | undefined, expectedOutput: string): CaseResult {
    if (!result) {
      return { status: 'IE', execTimeMs: null, memoryKb: null };
    }
    const statusId = result.status_id ?? result.status?.id ?? null;
    const timeSec = result.time != null ? Number.parseFloat(result.time) : Number.NaN;
    const execTimeMs = Number.isFinite(timeSec) ? Math.round(timeSec * 1000) : null;
    const memoryKb = result.memory ?? null;

    let status: CaseStatus;
    if (statusId === 3) {
      const stdout = result.stdout ? fromBase64(result.stdout) : '';
      status = compareOutput(stdout, expectedOutput) ? 'AC' : 'WA';
    } else if (statusId === 5) {
      status = 'TLE';
    } else if (statusId === 6) {
      status = 'CE';
    } else if (statusId != null && statusId >= 7 && statusId <= 12) {
      status = 'RE';
    } else {
      // 13, 14(Internal Error / Exec Format Error)およびその他の不明値
      status = 'IE';
    }
    return { status, execTimeMs, memoryKb };
  }
}
