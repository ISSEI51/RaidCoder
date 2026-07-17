// zod スキーマのバリデーションテスト
import { describe, expect, it } from 'vitest';
import { problemSchema, themeSchema } from '../src/schemas.js';

const validThemeProblem = (rank: string, i: number) => ({
  rank,
  title: `問題${i}`,
  topic: `分野${i}`,
  outline: `概要${i}`,
});

const validTheme = () => ({
  boss_name: '混沌竜バグゾーラ',
  boss_flavor: '「我がスタックは無限……のはずだった」',
  problems: ['S', 'A', 'B', 'C', 'D', 'E'].map(validThemeProblem),
});

const validProblem = () => ({
  statement_md: '## 問題文\n$N$ 個の整数の和を求めよ。',
  time_limit_ms: 2000,
  samples: [
    { input: '3\n1 2 3\n', output: '6\n' },
    { input: '1\n5\n', output: '5\n' },
  ],
  case_generator_py: 'import random, sys\nseed = int(input())\nrandom.seed(seed)\nprint(1)\nprint(seed)\n',
  official_solution_py: 'n = int(input())\nprint(sum(map(int, input().split())))\n',
  editorial_md: '## 解説\n合計を取るだけです。',
});

describe('themeSchema', () => {
  it('正しいテーマを受理する', () => {
    const parsed = themeSchema.parse(validTheme());
    expect(parsed.boss_name).toBe('混沌竜バグゾーラ');
    expect(parsed.problems).toHaveLength(6);
  });

  it('問題が5問しかないと拒否する', () => {
    const theme = validTheme();
    theme.problems.pop();
    expect(() => themeSchema.parse(theme)).toThrow();
  });

  it('ランクが重複していると拒否する', () => {
    const theme = validTheme();
    theme.problems[5] = validThemeProblem('S', 5); // E の代わりに S を2つ
    expect(() => themeSchema.parse(theme)).toThrow();
  });

  it('不正なランクを拒否する', () => {
    const theme = validTheme();
    theme.problems[0] = validThemeProblem('SS', 0);
    expect(() => themeSchema.parse(theme)).toThrow();
  });

  it('boss_name が空だと拒否する', () => {
    const theme = { ...validTheme(), boss_name: '' };
    expect(() => themeSchema.parse(theme)).toThrow();
  });

  it('boss_flavor 欠落を拒否する', () => {
    const { boss_flavor: _omit, ...theme } = validTheme();
    expect(() => themeSchema.parse(theme)).toThrow();
  });
});

describe('problemSchema', () => {
  it('正しい問題を受理する', () => {
    const parsed = problemSchema.parse(validProblem());
    expect(parsed.time_limit_ms).toBe(2000);
    expect(parsed.samples).toHaveLength(2);
  });

  it('サンプルが1件だけだと拒否する', () => {
    const problem = validProblem();
    problem.samples = [problem.samples[0]!];
    expect(() => problemSchema.parse(problem)).toThrow();
  });

  it('time_limit_ms が範囲外(小さすぎ)だと拒否する', () => {
    const problem = { ...validProblem(), time_limit_ms: 100 };
    expect(() => problemSchema.parse(problem)).toThrow();
  });

  it('time_limit_ms が範囲外(大きすぎ)だと拒否する', () => {
    const problem = { ...validProblem(), time_limit_ms: 60000 };
    expect(() => problemSchema.parse(problem)).toThrow();
  });

  it('time_limit_ms が数値文字列なら数値に変換する', () => {
    const problem = { ...validProblem(), time_limit_ms: '3000' };
    expect(problemSchema.parse(problem).time_limit_ms).toBe(3000);
  });

  it('time_limit_ms が非整数だと拒否する', () => {
    const problem = { ...validProblem(), time_limit_ms: 1999.5 };
    expect(() => problemSchema.parse(problem)).toThrow();
  });

  it('official_solution_py 欠落を拒否する', () => {
    const { official_solution_py: _omit, ...problem } = validProblem();
    expect(() => problemSchema.parse(problem)).toThrow();
  });

  it('サンプルの output が空文字列だと拒否する', () => {
    const problem = validProblem();
    problem.samples[0] = { input: '1\n', output: '' };
    expect(() => problemSchema.parse(problem)).toThrow();
  });
});
