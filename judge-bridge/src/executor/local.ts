// LocalUnsafeExecutor(EXECUTOR=local)— ★開発専用・信頼できるコードのみ実行すること★
//
// サンドボックスを一切使わず、ホストのツールチェーン
// (python3 / npx tsx / javac+java / rustc)で提出コードを child_process で直接実行する。
// 提出コードはホストのファイルシステムやネットワークへ自由にアクセスできてしまうため、
// 本番環境では絶対に使わないこと(本番は必ず EXECUTOR=judge0)。

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { compareOutput } from '../compare.js';
import { log } from '../logger.js';
import type { Language } from '../types.js';
import type { CaseResult, Executor, RunCase, RunParams } from './types.js';

/** コンパイル(javac / rustc)のタイムアウト */
const COMPILE_TIMEOUT_MS = 30_000;
/** stdout/stderr の取り込み上限(暴走対策) */
const MAX_OUTPUT_CHARS = 16 * 1024 * 1024;

interface Command {
  command: string;
  args: string[];
}

interface LanguageSpec {
  sourceFile: string;
  compile?: (dir: string) => Command;
  run: (dir: string) => Command;
}

// このパッケージの node_modules にある tsx を優先し、無ければ npx 経由にフォールバック
// (作業ディレクトリは一時ディレクトリになるため、npx が local bin を見つけられない)
const PKG_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const LOCAL_TSX_BIN = path.join(PKG_ROOT, 'node_modules', '.bin', 'tsx');

function tsxCommand(sourcePath: string): Command {
  if (existsSync(LOCAL_TSX_BIN)) {
    return { command: LOCAL_TSX_BIN, args: [sourcePath] };
  }
  return { command: 'npx', args: ['tsx', sourcePath] };
}

const SPECS: Record<Language, LanguageSpec> = {
  python: {
    sourceFile: 'main.py',
    run: (dir) => ({ command: 'python3', args: [path.join(dir, 'main.py')] }),
  },
  typescript: {
    sourceFile: 'main.ts',
    run: (dir) => tsxCommand(path.join(dir, 'main.ts')),
  },
  java: {
    // AtCoder と同様、エントリポイントは public class Main とする
    sourceFile: 'Main.java',
    compile: () => ({ command: 'javac', args: ['Main.java'] }),
    run: (dir) => ({ command: 'java', args: ['-cp', dir, 'Main'] }),
  },
  rust: {
    sourceFile: 'main.rs',
    compile: () => ({ command: 'rustc', args: ['-O', '-o', 'main', 'main.rs'] }),
    run: (dir) => ({ command: path.join(dir, 'main'), args: [] }),
  },
};

interface ProcessOutcome {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
  /** spawn 自体の失敗(ENOENT = ツールチェーン不在 など) */
  spawnErrorCode?: string;
}

function runProcess(
  cmd: Command,
  opts: { cwd: string; input?: string; timeoutMs: number },
): Promise<ProcessOutcome> {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(cmd.command, cmd.args, { cwd: opts.cwd, stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const finish = (outcome: Omit<ProcessOutcome, 'durationMs'>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...outcome, durationMs: performance.now() - started });
    };

    // time_limit_ms 超過で強制 kill(→ TLE)
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs);

    child.stdout.on('data', (buf: Buffer) => {
      if (stdout.length < MAX_OUTPUT_CHARS) stdout += buf.toString('utf8');
    });
    child.stderr.on('data', (buf: Buffer) => {
      if (stderr.length < MAX_OUTPUT_CHARS) stderr += buf.toString('utf8');
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      finish({ exitCode: null, stdout, stderr, timedOut, spawnErrorCode: err.code });
    });
    child.on('close', (code) => {
      finish({ exitCode: code, stdout, stderr, timedOut });
    });

    // プロセスが先に終了した場合の EPIPE を無害化
    child.stdin.on('error', () => {});
    if (opts.input != null) {
      child.stdin.write(opts.input);
    }
    child.stdin.end();
  });
}

export class LocalUnsafeExecutor implements Executor {
  async run(params: RunParams): Promise<CaseResult[]> {
    const spec = SPECS[params.language];
    const dir = await mkdtemp(path.join(os.tmpdir(), 'raidcoder-judge-'));
    try {
      await writeFile(path.join(dir, spec.sourceFile), params.code, 'utf8');

      // コンパイルが必要な言語(java / rust)
      if (spec.compile) {
        const compiled = await runProcess(spec.compile(dir), {
          cwd: dir,
          timeoutMs: COMPILE_TIMEOUT_MS,
        });
        if (compiled.spawnErrorCode) {
          this.warnMissingToolchain(params.language, spec.compile(dir).command, compiled.spawnErrorCode);
          return params.cases.map(() => ({ status: 'IE', execTimeMs: null, memoryKb: null }));
        }
        if (compiled.timedOut || compiled.exitCode !== 0) {
          // コンパイル失敗 → 全ケース CE
          return params.cases.map(() => ({ status: 'CE', execTimeMs: null, memoryKb: null }));
        }
      }

      const results: CaseResult[] = [];
      for (const testCase of params.cases) {
        results.push(await this.runCase(spec, dir, testCase, params));
      }
      return results;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async runCase(
    spec: LanguageSpec,
    dir: string,
    testCase: RunCase,
    params: RunParams,
  ): Promise<CaseResult> {
    const cmd = spec.run(dir);
    const outcome = await runProcess(cmd, {
      cwd: dir,
      input: testCase.input,
      timeoutMs: params.timeLimitMs,
    });

    if (outcome.spawnErrorCode) {
      this.warnMissingToolchain(params.language, cmd.command, outcome.spawnErrorCode);
      return { status: 'IE', execTimeMs: null, memoryKb: null };
    }

    const execTimeMs = Math.round(outcome.durationMs);
    if (outcome.timedOut) {
      return { status: 'TLE', execTimeMs: params.timeLimitMs, memoryKb: null };
    }
    if (outcome.exitCode !== 0) {
      return { status: 'RE', execTimeMs, memoryKb: null };
    }
    return {
      status: compareOutput(outcome.stdout, testCase.expectedOutput) ? 'AC' : 'WA',
      execTimeMs,
      // ローカル実行ではメモリ計測は行わない
      memoryKb: null,
    };
  }

  private warnMissingToolchain(language: Language, command: string, code: string | undefined): void {
    log('warn', `ツールチェーンを起動できません(${command})。IE として扱います`, {
      language,
      error_code: code ?? 'unknown',
      hint: 'EXECUTOR=local はホストに該当言語のツールチェーンが必要です',
    });
  }
}
