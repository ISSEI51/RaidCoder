// Judge0 CE クライアント(公式解・テストケースの検証用)
// CONTRACT §1: base64_encoded=true で送る / cpu_time_limit は秒 / memory_limit は KB
import { JUDGE0_PYTHON_LANGUAGE_ID } from './constants.js';

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 120_000;

// Judge0 のステータスID: 1=In Queue, 2=Processing, 3=Accepted, 5=TLE, 6=CE, ...
const STATUS_ACCEPTED = 3;
const STATUS_PROCESSING_MAX = 2;
export const STATUS_TLE = 5;

export interface Judge0RunResult {
  /** 正常終了(status.id === 3)かどうか */
  ok: boolean;
  statusId: number;
  statusDescription: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeSec: number | null;
}

function b64encode(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}

function b64decode(s: string | null | undefined): string {
  if (!s) return '';
  return Buffer.from(s, 'base64').toString('utf8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Judge0Submission {
  token?: string;
  status?: { id: number; description: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  time?: string | null;
}

export class Judge0Client {
  constructor(
    private readonly baseUrl: string,
    private readonly authToken?: string,
  ) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['X-Auth-Token'] = this.authToken;
    }
    return headers;
  }

  /** Python 3.8 (language_id=71) でコードを実行し、結果を返す */
  async runPython(
    sourceCode: string,
    stdin: string,
    timeLimitMs: number,
    memoryLimitKb: number,
  ): Promise<Judge0RunResult> {
    const createRes = await fetch(`${this.baseUrl}/submissions?base64_encoded=true&wait=false`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        language_id: JUDGE0_PYTHON_LANGUAGE_ID,
        source_code: b64encode(sourceCode),
        stdin: b64encode(stdin),
        cpu_time_limit: timeLimitMs / 1000,
        memory_limit: memoryLimitKb,
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`Judge0 への提出に失敗しました (HTTP ${createRes.status}): ${body.slice(0, 500)}`);
    }
    const created = (await createRes.json()) as Judge0Submission;
    if (!created.token) {
      throw new Error(`Judge0 がトークンを返しませんでした: ${JSON.stringify(created).slice(0, 500)}`);
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    for (;;) {
      await sleep(POLL_INTERVAL_MS);
      const getRes = await fetch(
        `${this.baseUrl}/submissions/${created.token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time`,
        { headers: this.headers() },
      );
      if (!getRes.ok) {
        const body = await getRes.text();
        throw new Error(`Judge0 の結果取得に失敗しました (HTTP ${getRes.status}): ${body.slice(0, 500)}`);
      }
      const sub = (await getRes.json()) as Judge0Submission;
      const statusId = sub.status?.id ?? 0;
      if (statusId > STATUS_PROCESSING_MAX) {
        return {
          ok: statusId === STATUS_ACCEPTED,
          statusId,
          statusDescription: sub.status?.description ?? `status ${statusId}`,
          stdout: b64decode(sub.stdout),
          stderr: b64decode(sub.stderr),
          compileOutput: b64decode(sub.compile_output),
          timeSec: sub.time != null ? Number(sub.time) : null,
        };
      }
      if (Date.now() > deadline) {
        throw new Error(`Judge0 の実行がタイムアウトしました (token: ${created.token})`);
      }
    }
  }
}
