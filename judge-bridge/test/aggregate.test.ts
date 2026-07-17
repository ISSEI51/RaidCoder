// aggregate のユニットテスト(CE 優先・IE > RE > TLE > WA の最悪値・全AC)

import { describe, expect, it } from 'vitest';
import { aggregate } from '../src/aggregate.js';
import type { CaseResult } from '../src/executor/types.js';
import type { CaseStatus } from '../src/types.js';

function c(status: CaseStatus, execTimeMs: number | null = null, memoryKb: number | null = null): CaseResult {
  return { status, execTimeMs, memoryKb };
}

describe('aggregate', () => {
  it('全ケース AC のみ AC になる', () => {
    const result = aggregate([c('AC', 10, 100), c('AC', 30, 50), c('AC', 20, 200)]);
    expect(result.status).toBe('AC');
    expect(result.passedCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.execTimeMs).toBe(30);
    expect(result.memoryKb).toBe(200);
  });

  it('1件でも CE があれば CE(IE より優先)', () => {
    expect(aggregate([c('AC'), c('IE'), c('CE')]).status).toBe('CE');
    expect(aggregate([c('CE'), c('AC'), c('AC')]).status).toBe('CE');
  });

  it('IE は RE より悪い', () => {
    expect(aggregate([c('AC'), c('RE'), c('IE'), c('WA')]).status).toBe('IE');
  });

  it('RE は TLE より悪い', () => {
    expect(aggregate([c('TLE'), c('RE'), c('AC')]).status).toBe('RE');
  });

  it('TLE は WA より悪い', () => {
    expect(aggregate([c('AC'), c('WA'), c('TLE')]).status).toBe('TLE');
  });

  it('AC と WA が混在なら WA', () => {
    const result = aggregate([c('AC'), c('WA'), c('AC')]);
    expect(result.status).toBe('WA');
    expect(result.passedCount).toBe(2);
    expect(result.totalCount).toBe(3);
  });

  it('1件でも AC でないケースがあれば AC にならない', () => {
    expect(aggregate([c('AC'), c('AC'), c('WA')]).status).not.toBe('AC');
  });

  it('ケース0件は IE(異常事態)', () => {
    const result = aggregate([]);
    expect(result.status).toBe('IE');
    expect(result.passedCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.execTimeMs).toBeNull();
    expect(result.memoryKb).toBeNull();
  });

  it('exec_time_ms / memory_kb は null を除いた最大値(全て null なら null)', () => {
    const result = aggregate([c('AC', null, null), c('WA', 120, 512), c('TLE', 2000, null)]);
    expect(result.execTimeMs).toBe(2000);
    expect(result.memoryKb).toBe(512);

    const allNull = aggregate([c('CE'), c('CE')]);
    expect(allNull.execTimeMs).toBeNull();
    expect(allNull.memoryKb).toBeNull();
  });

  it('passed_count は AC だったケース数', () => {
    const result = aggregate([c('AC'), c('WA'), c('AC'), c('TLE'), c('AC')]);
    expect(result.passedCount).toBe(3);
    expect(result.totalCount).toBe(5);
  });
});
