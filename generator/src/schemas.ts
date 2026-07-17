// AI 出力の構造検証 (zod)
import { z } from 'zod';
import { RANKS } from './constants.js';

export const rankSchema = z.enum(RANKS);

/** コール1(週テーマ)の各問題概要 */
export const themeProblemSchema = z.object({
  rank: rankSchema,
  title: z.string().min(1),
  topic: z.string().min(1), // アルゴリズム分野
  outline: z.string().min(1), // 問題の方向性
});

/** コール1(週テーマ)全体 */
export const themeSchema = z
  .object({
    boss_name: z.string().min(1),
    boss_flavor: z.string().min(1),
    problems: z.array(themeProblemSchema).length(RANKS.length),
  })
  .refine(
    (v) => new Set(v.problems.map((p) => p.rank)).size === RANKS.length,
    { message: 'problems には S, A, B, C, D, E の各ランクを1問ずつ含めること' },
  );

export const sampleSchema = z.object({
  input: z.string().min(1),
  output: z.string().min(1),
});

/** コール2(問題ごと)の出力 */
export const problemSchema = z.object({
  statement_md: z.string().min(1),
  time_limit_ms: z.coerce.number().int().min(500).max(10000),
  samples: z.array(sampleSchema).min(2),
  case_generator_py: z.string().min(1),
  official_solution_py: z.string().min(1),
  editorial_md: z.string().min(1),
});

export type ThemeProblem = z.infer<typeof themeProblemSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type GeneratedProblem = z.infer<typeof problemSchema>;
