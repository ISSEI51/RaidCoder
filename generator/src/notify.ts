// rotate の実行結果の通知 (CONTRACT §9 の ROTATE_WEBHOOK_URL)
//
// cron から実行される rotate は、失敗してもログファイルを読むまで気づけない。
// 実行のたびに結果を1件の Webhook へ POST し、ログを見なくても成否が分かるようにする。
// 送信先は Slack / Discord の Incoming Webhook など「JSON を POST できる URL」。
// 未設定なら送信しない。
// 死活監視サービスの ping URL は成否で URL を変える必要があるものが多く、
// 単一 URL への POST では失敗を成功として記録してしまうため対象外。
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

/** 通知本文の上限。Discord の 2000 文字制限を下回るように余裕を持たせる */
const DETAIL_MAX_LENGTH = 500;

const STATUS_LABEL: Record<RunStatus, string> = {
  success: 'OK',
  skipped: 'SKIPPED',
  failure: 'FAILED',
};

/**
 * 通知本文と rotate のサマリログに使う1行表現。
 * detail は上流の例外メッセージ(改行と stderr を含みうる)なので、
 * 1行に畳んで DETAIL_MAX_LENGTH で切り詰める。
 */
export function formatRunReport(report: RunReport): string {
  const seconds = (report.durationMs / 1000).toFixed(1);
  const week = report.weekNumber === null ? '-' : `第${report.weekNumber}週`;
  const collapsed = report.detail.replace(/\s+/g, ' ').trim();
  const detail =
    collapsed.length > DETAIL_MAX_LENGTH
      ? `${collapsed.slice(0, DETAIL_MAX_LENGTH)}…(以下省略)`
      : collapsed;
  return `RaidCoder ${report.command} ${STATUS_LABEL[report.status]} | ${week} | ${detail} | ${seconds}s | ${report.startedAt}`;
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
