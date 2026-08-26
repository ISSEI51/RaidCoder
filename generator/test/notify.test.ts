import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildEmailPayload,
  formatRunReport,
  sendRunReportEmail,
  type EmailConfig,
  type RunReport,
} from '../src/notify.js';

function report(overrides: Partial<RunReport> = {}): RunReport {
  return {
    command: 'rotate',
    status: 'success',
    weekNumber: 12,
    detail: '「Pythonaga」を activate',
    startedAt: '2026-08-24T15:00:00.000Z',
    durationMs: 92_400,
    ...overrides,
  };
}

const EMAIL: EmailConfig = {
  apiKey: 'key_test',
  from: 'raidcoder@example.test',
  to: ['ops@example.test'],
  endpoint: 'https://api.example.test/emails',
};

describe('formatRunReport', () => {
  it('成功時は週番号と所要時間を含む1行にする', () => {
    expect(formatRunReport(report())).toBe(
      'RaidCoder rotate OK | 第12週 | 「Pythonaga」を activate | 92.4s | 2026-08-24T15:00:00.000Z',
    );
  });

  it('失敗時は FAILED とエラーメッセージを含む', () => {
    const line = formatRunReport(
      report({ status: 'failure', weekNumber: null, detail: 'Judge0 に接続できません' }),
    );
    expect(line).toContain('FAILED');
    expect(line).toContain('Judge0 に接続できません');
    // 週が特定できない失敗では週番号を偽らない
    expect(line).toContain('| - |');
  });

  it('スキップ時は SKIPPED になる', () => {
    expect(formatRunReport(report({ status: 'skipped' }))).toContain('SKIPPED');
  });

  it('改行を含む detail を1行に畳む', () => {
    const line = formatRunReport(
      report({ status: 'failure', detail: 'claude CLI が異常終了しました\n  stderr:\n  panic' }),
    );
    expect(line).not.toContain('\n');
    expect(line).toContain('claude CLI が異常終了しました stderr: panic');
  });

  it('長すぎる detail を切り詰める', () => {
    const line = formatRunReport(report({ status: 'failure', detail: 'x'.repeat(5000) }));
    expect(line).toContain('…(以下省略)');
    expect(line.length).toBeLessThan(700);
  });
});

describe('buildEmailPayload', () => {
  it('件名に status と週番号を入れる', () => {
    const payload = buildEmailPayload(report(), EMAIL);
    expect(payload.subject).toBe('[RaidCoder] rotate OK — 第12週');
    expect(payload.from).toBe('raidcoder@example.test');
    expect(payload.to).toEqual(['ops@example.test']);
  });

  it('失敗時の件名は FAILED になり、週が不明なら週番号を付けない', () => {
    const payload = buildEmailPayload(
      report({ status: 'failure', weekNumber: null, detail: 'boom' }),
      EMAIL,
    );
    expect(payload.subject).toBe('[RaidCoder] rotate FAILED');
  });

  it('本文には切り詰めていない detail 全文を入れる', () => {
    const detail = `${'y'.repeat(2000)}\n末尾の行`;
    const payload = buildEmailPayload(report({ status: 'failure', detail }), EMAIL);
    expect(payload.text).toContain(detail);
    expect(payload.text).toContain('末尾の行');
    // サマリ行(切り詰めあり)と構造化された値も含む
    expect(payload.text).toContain('…(以下省略)');
    expect(payload.text).toContain('status: failure');
    expect(payload.text).toContain('durationMs: 92400');
  });
});

describe('sendRunReportEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('設定が無ければ送信しない', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await sendRunReportEmail(undefined, report());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Bearer 認証で送信 API に POST する', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await sendRunReportEmail(EMAIL, report());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer key_test');
    const body = JSON.parse(init.body);
    expect(body.subject).toBe('[RaidCoder] rotate OK — 第12週');
    expect(body.to).toEqual(['ops@example.test']);
    expect(body.text).toContain('第12週');
  });

  it('HTTP エラーでも例外を投げない(rotate の成否を変えない)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));
    await expect(sendRunReportEmail(EMAIL, report())).resolves.toBeUndefined();
  });

  it('送信が例外で失敗しても投げない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.example.test')),
    );
    await expect(sendRunReportEmail(EMAIL, report())).resolves.toBeUndefined();
  });
});
