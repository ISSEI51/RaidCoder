// コール2: 問題ごとの生成 + Judge0 検証(失敗した問題のみ最大3リトライ)
import { MAX_PROBLEM_ATTEMPTS } from '../constants.js';
import type { TestCaseData } from '../db.js';
import type { Judge0Client } from '../judge0.js';
import { extractJson } from '../json.js';
import { log, warn } from '../log.js';
import { buildProblemUserPrompt, PROBLEM_SYSTEM } from '../prompts.js';
import type { AIProvider } from '../providers/types.js';
import { problemSchema, type GeneratedProblem, type Theme, type ThemeProblem } from '../schemas.js';
import { materializeTestCases, sampleOnlyTestCases } from './materialize.js';

export interface BuiltProblem {
  outline: ThemeProblem;
  generated: GeneratedProblem;
  testCases: TestCaseData[];
}

/**
 * 1問を生成し、テストケースを実体化する。
 * judge0 が null(--skip-validation)の場合は検証を飛ばし、サンプルのみを保存対象にする。
 */
export async function buildProblem(
  provider: AIProvider,
  judge0: Judge0Client | null,
  theme: Theme,
  outline: ThemeProblem,
): Promise<BuiltProblem> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_PROBLEM_ATTEMPTS; attempt++) {
    try {
      log(
        `ランク ${outline.rank}「${outline.title}」を生成中... (試行 ${attempt}/${MAX_PROBLEM_ATTEMPTS})`,
      );
      const previousError = lastError !== undefined ? errMessage(lastError) : undefined;
      const raw = await provider.complete(
        PROBLEM_SYSTEM,
        buildProblemUserPrompt(theme, outline, previousError),
      );
      const generated = problemSchema.parse(extractJson(raw));

      const testCases =
        judge0 === null
          ? sampleOnlyTestCases(generated)
          : await materializeTestCases(judge0, generated);

      log(`ランク ${outline.rank}: 生成完了 (テストケース ${testCases.length} 件)`);
      return { outline, generated, testCases };
    } catch (err) {
      lastError = err;
      warn(`ランク ${outline.rank} の生成に失敗 (試行 ${attempt}/${MAX_PROBLEM_ATTEMPTS}): ${errMessage(err)}`);
    }
  }
  throw new Error(
    `ランク ${outline.rank}「${outline.title}」の生成に ${MAX_PROBLEM_ATTEMPTS} 回失敗しました: ${errMessage(lastError)}`,
  );
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
