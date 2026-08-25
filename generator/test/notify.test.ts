import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatRunReport, postRunReport, type RunReport } from '../src/notify.js';

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

  it('長すぎる detail を切り詰める(Discord の 2000 文字制限対策)', () => {
    const line = formatRunReport(report({ status: 'failure', detail: 'x'.repeat(5000) }));
    expect(line).toContain('…(以下省略)');
    expect(line.length).toBeLessThan(700);
  });
});

describe('postRunReport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('URL 未設定なら送信しない', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await postRunReport(undefined, report());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('サマリを text と content の両方に入れて POST する', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await postRunReport('https://example.test/hook', report());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.test/hook');
    const body = JSON.parse(init.body);
    expect(body.text).toBe(body.content);
    expect(body.text).toContain('第12週');
    expect(body.status).toBe('success');
    expect(body.weekNumber).toBe(12);
  });

  it('送信が失敗しても例外を投げない(rotate の成否を変えない)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND example.test')),
    );
    await expect(postRunReport('https://example.test/hook', report())).resolves.toBeUndefined();
  });
});
