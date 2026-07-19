// テストケースの実体化 (Judge0 使用)
// - サンプル: 公式解の出力が sample.output と一致するか検証
// - 隠しケース: seed 1..10 で case_generator_py を実行し、公式解で expected_output を作る
import {
  DEFAULT_MEMORY_LIMIT_KB,
  GENERATOR_TIME_LIMIT_MS,
  HIDDEN_CASE_SEEDS,
} from '../constants.js';
import type { TestCaseData } from '../db.js';
import { Judge0Client, STATUS_TLE } from '../judge0.js';
import type { GeneratedProblem } from '../schemas.js';

/** CONTRACT §1 の判定と同じ比較: 各行の末尾空白と末尾の改行をトリムして厳密比較 */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/\n+$/u, '');
}

function sampleName(index: number): string {
  return `sample_${index + 1}`;
}

function hiddenName(seed: number): string {
  return `hidden_${String(seed).padStart(2, '0')}`;
}

/** 検証をスキップする場合: サンプルのみをテストケースとして返す */
export function sampleOnlyTestCases(problem: GeneratedProblem): TestCaseData[] {
  return problem.samples.map((s, i) => ({
    name: sampleName(i),
    input: s.input,
    expectedOutput: s.output,
    isSample: true,
  }));
}

/**
 * Judge0 で公式解を検証し、サンプル+隠しケース10件を実体化する。
 * 検証に失敗した場合は Error を投げる(呼び出し側で問題ごと再生成)。
 *
 * solutionProgramPy は「official_solution_py(class Solution)+ Python ハーネス」を
 * 連結した実行可能プログラム(呼び出し側 problem.ts が組み立てる)。
 */
export async function materializeTestCases(
  judge0: Judge0Client,
  problem: GeneratedProblem,
  solutionProgramPy: string,
): Promise<TestCaseData[]> {
  const cases: TestCaseData[] = [];

  // 1. サンプル検証: 公式解プログラムを各 sample.input で実行して一致確認
  for (const [i, sample] of problem.samples.entries()) {
    const res = await judge0.runPython(
      solutionProgramPy,
      sample.input,
      problem.time_limit_ms,
      DEFAULT_MEMORY_LIMIT_KB,
    );
    if (!res.ok) {
      throw new Error(
        `${sampleName(i)}: 公式解の実行に失敗 (${res.statusDescription})\n` +
          `stderr: ${res.stderr.slice(0, 500)}${res.compileOutput ? `\ncompile: ${res.compileOutput.slice(0, 500)}` : ''}`,
      );
    }
    if (normalizeOutput(res.stdout) !== normalizeOutput(sample.output)) {
      throw new Error(
        `${sampleName(i)}: 公式解の出力がサンプル出力と一致しません\n` +
          `期待: ${sample.output.slice(0, 300)}\n実際: ${res.stdout.slice(0, 300)}`,
      );
    }
    cases.push({
      name: sampleName(i),
      input: sample.input,
      expectedOutput: sample.output,
      isSample: true,
    });
  }

  // 2. 隠しケース: seed 1..10 で入力を生成し、公式解で期待出力を作る
  for (const seed of HIDDEN_CASE_SEEDS) {
    const gen = await judge0.runPython(
      problem.case_generator_py,
      `${seed}\n`,
      GENERATOR_TIME_LIMIT_MS,
      DEFAULT_MEMORY_LIMIT_KB,
    );
    if (!gen.ok) {
      throw new Error(
        `${hiddenName(seed)}: case_generator_py の実行に失敗 (${gen.statusDescription})\n` +
          `stderr: ${gen.stderr.slice(0, 500)}`,
      );
    }
    if (gen.stdout.trim() === '') {
      throw new Error(`${hiddenName(seed)}: case_generator_py の出力(テスト入力)が空です`);
    }

    const sol = await judge0.runPython(
      solutionProgramPy,
      gen.stdout,
      problem.time_limit_ms,
      DEFAULT_MEMORY_LIMIT_KB,
    );
    if (!sol.ok) {
      const reason =
        sol.statusId === STATUS_TLE
          ? `公式解が time_limit (${problem.time_limit_ms}ms) を超過しました。より高速な解法にするか制約を緩めること`
          : `公式解の実行に失敗 (${sol.statusDescription})\nstderr: ${sol.stderr.slice(0, 500)}`;
      throw new Error(`${hiddenName(seed)}: ${reason}`);
    }
    if (sol.stdout.trim() === '') {
      throw new Error(`${hiddenName(seed)}: 公式解の出力が空です`);
    }

    cases.push({
      name: hiddenName(seed),
      input: gen.stdout,
      expectedOutput: sol.stdout,
      isSample: false,
    });
  }

  return cases;
}
