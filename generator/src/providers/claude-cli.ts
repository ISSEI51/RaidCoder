// ローカル開発用プロバイダ: claude CLI を子プロセスで実行する
// claude setup-token / OAuth の認証をそのまま利用するため API キー不要
import { spawn } from 'node:child_process';
import type { AIProvider } from './types.js';

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 問題1問の生成は長くなり得るため 15 分

export class ClaudeCliProvider implements AIProvider {
  constructor(
    private readonly model: string,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  complete(system: string, user: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const args = [
        '-p',
        '--model',
        this.model,
        '--output-format',
        'text',
        '--append-system-prompt',
        system,
      ];
      const child = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill('SIGKILL');
        reject(new Error(`claude CLI がタイムアウトしました (${this.timeoutMs}ms)`));
      }, this.timeoutMs);

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });

      child.on('error', (err: NodeJS.ErrnoException) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err.code === 'ENOENT') {
          reject(
            new Error(
              'claude CLI が見つかりません。Claude Code をインストールし、claude setup-token で認証してください',
            ),
          );
        } else {
          reject(err);
        }
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new Error(`claude CLI が異常終了しました (exit code: ${code})\n${stderr.slice(0, 2000)}`),
          );
        }
      });

      // プロンプトは stdin 経由で渡す
      child.stdin.write(user);
      child.stdin.end();
    });
  }
}
