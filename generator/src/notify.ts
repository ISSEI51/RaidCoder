// rotate の実行結果の通知 (CONTRACT §9 の ROTATE_EMAIL_*)
//
// cron から実行される rotate は、失敗してもログファイルを読むまで気づけない。
// 実行のたびに結果を1通メールで送り、ログを見なくても成否が分かるようにする。
// 成功・スキップも送るため、週明けに何も届かないこと自体が異常の合図になる。
//
// 送信は HTTPS のメール送信 API を fetch で呼ぶ(新規依存を増やさないため)。
// 既定のエンドポイントは Resend だが、Bearer 認証 + JSON body の API であれば
// ROTATE_EMAIL_ENDPOINT で差し替えられる。
// SMTP は Node の標準機能にクライアントが無く、AWS SES は SigV4 署名か SDK が要るため使わない。
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

export interface EmailConfig {
  apiKey: string;
  from: string;
  /** 宛先。ROTATE_EMAIL_TO のカンマ区切りを分解したもの */
  to: string[];
  endpoint: string;
}

export interface EmailPayload {
  from: string;
  to: string[];
  subject: string;
  text: string;
}

/** 件名とサマリ行に載せる detail の上限。件名・本文が過度に長くなるのを防ぐ */
const DETAIL_MAX_LENGTH = 500;

const STATUS_LABEL: Record<RunStatus, string> = {
  success: 'OK',
  skipped: 'SKIPPED',
  failure: 'FAILED',
};

/**
 * 通知の件名と rotate のサマリログに使う1行表現。
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
 * 送信するメールの組み立て。
 * 件名は一覧で判別できるよう status と週番号だけにし、
 * 本文には切り詰めていない detail 全文を入れる(失敗の原因を読むため)。
 */
export function buildEmailPayload(report: RunReport, config: EmailConfig): EmailPayload {
  const week = report.weekNumber === null ? '' : ` — 第${report.weekNumber}週`;
  const subject = `[RaidCoder] ${report.command} ${STATUS_LABEL[report.status]}${week}`;
  const text = [
    formatRunReport(report),
    '',
    `status: ${report.status}`,
    `week: ${report.weekNumber === null ? '-' : report.weekNumber}`,
    `startedAt: ${report.startedAt}`,
    `durationMs: ${report.durationMs}`,
    '',
    'detail:',
    report.detail,
  ].join('\n');

  return { from: config.from, to: config.to, subject, text };
}

/**
 * 実行結果をメールで送る。
 * 送信の失敗は rotate の成否を変えない(警告を出して握りつぶす)。
 */
export async function sendRunReportEmail(
  config: EmailConfig | undefined,
  report: RunReport,
): Promise<void> {
  const summary = formatRunReport(report);
  log(summary);

  if (!config) {
    warn('ROTATE_EMAIL_* が未設定のため、実行結果のメールは送信しません');
    return;
  }

  const payload = buildEmailPayload(report, config);

  try {
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      warn(`実行結果のメール送信に失敗しました (HTTP ${res.status})`);
      return;
    }
    log(`実行結果を ${config.to.join(', ')} へメールで送信しました`);
  } catch (err: unknown) {
    warn(
      `実行結果のメール送信に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
