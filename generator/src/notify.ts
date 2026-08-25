// rotate の実行結果の通知 (CONTRACT §9 の ROTATE_WEBHOOK_URL)
//
// cron から実行される rotate は、失敗してもログファイルを読むまで気づけない。
// 実行のたびに結果を1件の Webhook へ POST し、ログを見なくても成否が分かるようにする。
// 送信先は Slack / Discord の Incoming Webhook や Healthchecks の ping URL など
// 「JSON を POST できる URL」であれば何でもよい。未設定なら送信しない。
import { log, warn } from './log.js';

export type RunStatus = 'success' | 'skipped' | 'failure';

export interface RunReport {
  /** 実行したコマンド名 (現状は rotate のみ) */
  command: string;
  status: RunStatus;
  /** activate した週番号。該当しない場合は null */
  weekNumber: number | null;
  /** 人が読む1行の説明。失敗時はエラーメッセージ */
  detail: string;
  /** 実行開始時刻 (ISO 8601 / UTC) */
  startedAt: string;
  durationMs: number;
}

const STATUS_LABEL: Record<RunStatus, string> = {
  success: 'OK',
  skipped: 'SKIPPED',
  failure: 'FAILED',
};

/** 通知本文と rotate のサマリログに使う1行表現 */
export function formatRunReport(report: RunReport): string {
  const seconds = (report.durationMs / 1000).toFixed(1);
  const week = report.weekNumber === null ? '-' : `第${report.weekNumber}週`;
  return `RaidCoder ${report.command} ${STATUS_LABEL[report.status]} | ${week} | ${report.detail} | ${seconds}s | ${report.startedAt}`;
}

/**
 * Webhook へ実行結果を POST する。
 * 送信の失敗は rotate の成否を変えない(警告を出して握りつぶす)。
 */
export async function postRunReport(
  webhookUrl: string | undefined,
  report: RunReport,
): Promise<void> {
  const summary = formatRunReport(report);
  log(summary);

  if (!webhookUrl) {
    warn('ROTATE_WEBHOOK_URL が未設定のため、実行結果の通知は送信しません');
    return;
  }

  // text は Slack、content は Discord が読む。どちらでもない受け口のために
  // 構造化した値もそのまま含める
  const body = JSON.stringify({ text: summary, content: summary, ...report });

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      warn(`実行結果の通知に失敗しました (HTTP ${res.status})`);
      return;
    }
    log('実行結果を通知しました');
  } catch (err: unknown) {
    warn(`実行結果の通知に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
  }
}
