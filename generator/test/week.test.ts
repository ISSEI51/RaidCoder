// JST 週境界計算のテスト(luxon で決定的に)
import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { isWeekExpired, jstWeekStart, nextWeekBounds, RAID_TIMEZONE } from '../src/week.js';

const jst = (iso: string) => DateTime.fromISO(iso, { zone: RAID_TIMEZONE });

describe('jstWeekStart', () => {
  it('木曜の途中 → その週の月曜 00:00 JST', () => {
    // 2026-07-16 は木曜
    const start = jstWeekStart(jst('2026-07-16T10:30:00'));
    expect(start.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
  });

  it('月曜 00:00 ちょうど → その瞬間', () => {
    const start = jstWeekStart(jst('2026-07-13T00:00:00'));
    expect(start.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
  });

  it('日曜 23:59 JST → 前の月曜', () => {
    const start = jstWeekStart(jst('2026-07-19T23:59:59'));
    expect(start.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
  });

  it('UTC 日曜夜 = JST 月曜早朝はゾーン変換して JST 基準で判定する', () => {
    // 2026-07-12T16:30Z = 2026-07-13T01:30+09:00 (月曜)
    const start = jstWeekStart(DateTime.fromISO('2026-07-12T16:30:00Z'));
    expect(start.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
  });

  it('UTC 月曜朝 = JST 月曜夕方でも同じ月曜になる', () => {
    const start = jstWeekStart(DateTime.fromISO('2026-07-13T08:00:00Z'));
    expect(start.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
  });
});

describe('nextWeekBounds', () => {
  it('前週なし(初回)→ 今週の月曜〜翌月曜', () => {
    const { startsAt, endsAt } = nextWeekBounds(jst('2026-07-16T12:00:00'));
    expect(startsAt.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
    expect(endsAt.toISO()).toBe('2026-07-20T00:00:00.000+09:00');
  });

  it('rotate シナリオ: 月曜 00:00:30 に直前週(ends_at = その月曜 00:00)から連続する', () => {
    const now = jst('2026-07-13T00:00:30');
    const prevEndsAt = jst('2026-07-13T00:00:00');
    const { startsAt, endsAt } = nextWeekBounds(now, prevEndsAt);
    expect(startsAt.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
    expect(endsAt.toISO()).toBe('2026-07-20T00:00:00.000+09:00');
  });

  it('週の途中の先行生成: 現行週の ends_at(次の月曜)から始まる', () => {
    const now = jst('2026-07-16T12:00:00'); // 木曜
    const prevEndsAt = jst('2026-07-20T00:00:00'); // 現行 active 週の終了 = 次の月曜
    const { startsAt, endsAt } = nextWeekBounds(now, prevEndsAt);
    expect(startsAt.toISO()).toBe('2026-07-20T00:00:00.000+09:00');
    expect(endsAt.toISO()).toBe('2026-07-27T00:00:00.000+09:00');
  });

  it('長期停止後(前週の ends_at が過去)→ 今週の月曜から再開する', () => {
    const now = jst('2026-07-16T12:00:00');
    const prevEndsAt = jst('2026-06-22T00:00:00'); // 3週間以上前
    const { startsAt } = nextWeekBounds(now, prevEndsAt);
    expect(startsAt.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
  });

  it('prevEndsAt が UTC 表現でも JST 基準で連続する', () => {
    const now = DateTime.fromISO('2026-07-12T15:00:30Z'); // = 月曜 00:00:30 JST
    const prevEndsAt = DateTime.fromISO('2026-07-12T15:00:00Z'); // = 月曜 00:00 JST
    const { startsAt, endsAt } = nextWeekBounds(now, prevEndsAt);
    expect(startsAt.toISO()).toBe('2026-07-13T00:00:00.000+09:00');
    expect(endsAt.toISO()).toBe('2026-07-20T00:00:00.000+09:00');
  });

  it('週の長さはちょうど7日', () => {
    const { startsAt, endsAt } = nextWeekBounds(jst('2026-07-16T12:00:00'));
    expect(endsAt.diff(startsAt, 'days').days).toBe(7);
  });

  it('リカバリ再生成 + cron 早起動: 期限切れ間近の週は生成せず 1 週進める', () => {
    // rotate が activate 前に落ちた翌週、cron が日曜 23:59:30(月曜 00:00 の 30 秒前)に起動。
    // 期限切れ upcoming 週の削除後、直前週の ends_at は 1 週間前の月曜(= 現在週の月曜)。
    // 素朴に計算すると ends_at = 30 秒後の週になってしまうため、1 週進むことを確認する。
    const now = jst('2026-07-19T23:59:30'); // 日曜
    const prevEndsAt = jst('2026-07-13T00:00:00'); // 現在週の月曜
    const { startsAt, endsAt } = nextWeekBounds(now, prevEndsAt);
    expect(startsAt.toISO()).toBe('2026-07-20T00:00:00.000+09:00');
    expect(endsAt.toISO()).toBe('2026-07-27T00:00:00.000+09:00');
  });

  it('前週なしでも週末ギリギリなら次の月曜からの週になる', () => {
    const now = jst('2026-07-19T23:59:30'); // 日曜(現在週の残りは 30 秒)
    const { startsAt, endsAt } = nextWeekBounds(now);
    expect(startsAt.toISO()).toBe('2026-07-20T00:00:00.000+09:00');
    expect(endsAt.toISO()).toBe('2026-07-27T00:00:00.000+09:00');
  });
});

describe('isWeekExpired', () => {
  const now = jst('2026-07-13T00:00:00'); // 月曜 00:00 JST

  it('ends_at が過去 → 期限切れ', () => {
    expect(isWeekExpired(jst('2026-07-06T00:00:00'), now)).toBe(true);
  });

  it('ends_at = ちょうど今(activate 前に落ちた rotate の残骸)→ 期限切れ', () => {
    expect(isWeekExpired(jst('2026-07-13T00:00:00'), now)).toBe(true);
  });

  it('ends_at が猶予(1分)以内 → 期限切れ扱い', () => {
    expect(isWeekExpired(jst('2026-07-13T00:00:30'), now)).toBe(true);
    expect(isWeekExpired(jst('2026-07-13T00:01:00'), now)).toBe(true);
  });

  it('ends_at が猶予より先 → 期限内', () => {
    expect(isWeekExpired(jst('2026-07-13T00:01:01'), now)).toBe(false);
    expect(isWeekExpired(jst('2026-07-20T00:00:00'), now)).toBe(false);
  });

  it('cron が 30 秒早く起動しても、終了直前の active 週は期限切れ(finalize 対象)と判定される', () => {
    const early = jst('2026-07-12T23:59:30'); // 日曜 23:59:30
    expect(isWeekExpired(jst('2026-07-13T00:00:00'), early)).toBe(true);
  });

  it('不正な日時 → 期限切れ扱い(安全側)', () => {
    expect(isWeekExpired(DateTime.invalid('test'), now)).toBe(true);
  });
});
