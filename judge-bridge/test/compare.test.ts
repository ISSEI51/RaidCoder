// compareOutput のユニットテスト(末尾空白・改行の揺れ、完全不一致)

import { describe, expect, it } from 'vitest';
import { compareOutput } from '../src/compare.js';

describe('compareOutput', () => {
  it('完全一致なら true', () => {
    expect(compareOutput('1 2 3\n4 5 6\n', '1 2 3\n4 5 6\n')).toBe(true);
  });

  it('各行の末尾スペース・タブの揺れを許容する', () => {
    expect(compareOutput('1 2 \n3\t\n', '1 2\n3\n')).toBe(true);
    expect(compareOutput('abc', 'abc   ')).toBe(true);
  });

  it('末尾改行の有無を許容する', () => {
    expect(compareOutput('42', '42\n')).toBe(true);
    expect(compareOutput('42\n', '42')).toBe(true);
  });

  it('末尾の空行の揺れを許容する', () => {
    expect(compareOutput('a\nb\n\n\n', 'a\nb')).toBe(true);
    expect(compareOutput('a\nb', 'a\nb\n\n')).toBe(true);
  });

  it('CRLF 改行を許容する(行末の CR は末尾空白として除去)', () => {
    expect(compareOutput('1\r\n2\r\n', '1\n2\n')).toBe(true);
  });

  it('値が異なれば false(完全不一致)', () => {
    expect(compareOutput('hello', 'world')).toBe(false);
    expect(compareOutput('1 2 3', '1 2 4')).toBe(false);
  });

  it('行数が異なれば false', () => {
    expect(compareOutput('1\n2', '1')).toBe(false);
    expect(compareOutput('1', '1\n2')).toBe(false);
  });

  it('途中の空行は意味を持つ(除去されない)', () => {
    expect(compareOutput('a\n\nb', 'a\nb')).toBe(false);
    expect(compareOutput('a\n\nb', 'a\n\nb')).toBe(true);
  });

  it('行頭・行中の空白は無視しない', () => {
    expect(compareOutput(' 1', '1')).toBe(false);
    expect(compareOutput('1  2', '1 2')).toBe(false);
  });

  it('空出力と空白のみの出力は一致扱い', () => {
    expect(compareOutput('', '')).toBe(true);
    expect(compareOutput('', '\n')).toBe(true);
    expect(compareOutput('  \n', '')).toBe(true);
  });

  it('マルチバイト(日本語)も厳密比較できる', () => {
    expect(compareOutput('こんにちは\n', 'こんにちは')).toBe(true);
    expect(compareOutput('こんにちは', 'こんばんは')).toBe(false);
  });
});
