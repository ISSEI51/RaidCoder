// 出力比較の正規化(末尾空白・末尾改行トリム)のテスト
import { describe, expect, it } from 'vitest';
import { normalizeOutput } from '../src/pipeline/materialize.js';

describe('normalizeOutput', () => {
  it('末尾の改行を無視して比較できる', () => {
    expect(normalizeOutput('6\n')).toBe(normalizeOutput('6'));
    expect(normalizeOutput('6\n\n\n')).toBe(normalizeOutput('6'));
  });

  it('各行の末尾空白を無視する', () => {
    expect(normalizeOutput('1 2 \n3\t\n')).toBe(normalizeOutput('1 2\n3'));
  });

  it('CRLF を LF に揃える', () => {
    expect(normalizeOutput('a\r\nb\r\n')).toBe(normalizeOutput('a\nb'));
  });

  it('行中の空白は保持する', () => {
    expect(normalizeOutput('1 2 3')).not.toBe(normalizeOutput('123'));
  });

  it('先頭の空白は保持する(トリムしない)', () => {
    expect(normalizeOutput('  x')).not.toBe(normalizeOutput('x'));
  });
});
