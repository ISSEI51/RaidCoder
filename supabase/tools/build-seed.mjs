#!/usr/bin/env node
// supabase/seed.sql(ローカル開発用のチュートリアル週)を problems.mjs から生成する。
//
//   cd generator && npm install && npm run build   # codegen.ts をビルド(初回のみ)
//   node supabase/tools/build-seed.mjs             # 検証して seed.sql を書き出す
//   node supabase/tools/build-seed.mjs --check     # 書き出さず、既存 seed.sql との一致だけ確認する
//
// 手で seed.sql を編集しないこと。問題の追加・修正は problems.mjs を直し、
// このスクリプトを実行し直す。
//
// - code_templates / judge_harnesses は generator/src/codegen.ts が signature から
//   決定的に生成する(本番の問題と同じ生成器を使うので、ずれない)
// - 出力前に、公式解 + Python ハーネスを python3 で全テストケースに対して実行し、
//   期待出力と一致するかを検証する。さらに素朴な別解(brutePy)とも突き合わせる
//   (production の materialize.ts が Judge0 でやっている検証のローカル版)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROBLEMS } from './problems.mjs';

const CHECK_ONLY = process.argv.includes('--check');

// codegen は generator のビルド成果物(dist)を使う。本番の問題生成と同じコードを通すため、
// このスクリプト用に処理を写経しない。
let generateCode;
try {
  ({ generateCode } = await import('../../generator/dist/codegen.js'));
} catch (e) {
  // ERR_MODULE_NOT_FOUND は「未ビルド」だけでなく部分ビルド(dist/signature.js だけ無い等)でも
  // 起きるため、案内と実際の例外の両方を出す。
  if (e?.code === 'ERR_MODULE_NOT_FOUND') {
    console.error(
      'generator/dist/codegen.js を読み込めませんでした。' +
        '`cd generator && npm install && npm run build` を実行してください。',
    );
  } else {
    console.error('generator/dist/codegen.js の読み込みに失敗しました。');
  }
  console.error(e);
  process.exit(1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(HERE, '..', 'seed.sql');

const WEEK_ID = '11111111-1111-1111-1111-111111111111';
const MEMORY_LIMIT_KB = 262144;

// ---------------------------------------------------------------- 検証

/** CONTRACT §1 の判定と同じ比較(materialize.ts の normalizeOutput と同一) */
function normalizeOutput(s) {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/\n+$/u, '');
}

const PYTHON_TIMEOUT_MS = 30000;

function runPython(program, input) {
  return execFileSync('python3', ['-c', program], {
    input,
    encoding: 'utf8',
    timeout: PYTHON_TIMEOUT_MS,
  });
}

/**
 * execFileSync の例外から表示できる失敗理由を取り出す。
 * タイムアウトで SIGTERM 終了した場合 stderr は空文字列(undefined ではない)になるため、
 * `??` ではなく中身の有無で判定する。
 */
function failureDetail(e) {
  const stderr = typeof e.stderr === 'string' ? e.stderr.trim() : '';
  if (stderr) return stderr;
  if (e.signal) return `${e.message}(signal=${e.signal} / timeout=${PYTHON_TIMEOUT_MS}ms)`;
  return e.message;
}

/** 解答コード + Python ハーネスを全ケースで実行し、期待出力と一致するか確かめる */
function verify(problem, harnessPy) {
  for (const [label, code] of [
    ['公式解', problem.solutionPy],
    ['素朴解', problem.brutePy],
  ]) {
    for (const c of problem.cases) {
      let stdout;
      try {
        stdout = runPython(code + harnessPy, c.input);
      } catch (e) {
        throw new Error(
          `[${problem.rank}] ${c.name}: ${label}の実行に失敗\n${failureDetail(e)}`,
        );
      }
      if (normalizeOutput(stdout) !== normalizeOutput(c.output)) {
        throw new Error(
          `[${problem.rank}] ${c.name}: ${label}の出力が期待出力と一致しません\n` +
            `期待: ${JSON.stringify(c.output)}\n実際: ${JSON.stringify(stdout)}`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------- SQL 生成

/** PostgreSQL の E'...' 文字列リテラルへエスケープする */
function sqlText(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `E'${escaped}'`;
}

function sqlJsonb(value) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function problemSql(problem) {
  const { templates, harnesses } = generateCode(problem.signature);
  verify(problem, harnesses.python);

  const cases = problem.cases
    .map(
      (c) =>
        `  (${sqlText(problem.id)}, ${sqlText(c.name)}, ${sqlText(c.input)}, ` +
        `${sqlText(c.output)}, ${c.isSample})`,
    )
    .join(',\n');

  return `-- ============ ${problem.rank}: ${problem.title} ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage,
   signature, code_templates, judge_harnesses)
values (
  ${sqlText(problem.id)},
  ${sqlText(WEEK_ID)},
  ${sqlText(problem.rank)},
  ${sqlText(problem.title)},
  ${sqlText(problem.statementMd)},
  ${problem.timeLimitMs}, ${MEMORY_LIMIT_KB}, ${problem.baseDamage},
  ${sqlJsonb(problem.signature)},
  ${sqlJsonb(templates)},
  ${sqlJsonb(harnesses)}
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
${cases};

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  ${sqlText(problem.id)},
  ${sqlText(problem.editorialMd)},
  ${sqlJsonb([{ language: 'python', code: problem.solutionPy }])}
);
`;
}

const header = `-- ローカル開発用シード: チュートリアル週(AI生成なしで一通り遊べる)
-- 本番では generator が毎週これに相当するデータを生成する。
--
-- このファイルは自動生成される。直接編集せず、supabase/tools/problems.mjs を編集して
--   cd generator && npm install && npm run build && cd ..
--   node supabase/tools/build-seed.mjs
-- を実行し直すこと(生成時に公式解を python3 で全テストケース検証している)。
--
-- 問題は本番と同じ LeetCode 形式(CONTRACT §1)。ランクは S/A/B/C/D/E の6問で、
-- base_damage は CONTRACT §3 の値。

insert into public.raid_weeks
  (id, week_number, starts_at, ends_at, boss_name, boss_flavor, boss_max_hp, boss_hp, status)
values (
  '${WEEK_ID}',
  1,
  -- CONTRACT §6: 週 = 月曜 00:00 JST 〜 翌月曜 00:00 JST
  -- (セッション TZ 依存の date_trunc('week', now()) だと UTC 基準になり 9 時間ずれる)
  date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo',
  (date_trunc('week', now() at time zone 'Asia/Tokyo') + interval '7 days') at time zone 'Asia/Tokyo',
  'Tutorial Slime',
  '最初の獲物。だが油断するな——奴のHPは6万ある。仲間と力を合わせて削り切れ!',
  60000,
  60000,
  'active'
);
`;

// 難易度の低い順(E → S)に並べる
const order = ['E', 'D', 'C', 'B', 'A', 'S'];
const problems = [...PROBLEMS].sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));

const ranks = problems.map((p) => p.rank);
for (const rank of order) {
  if (!ranks.includes(rank)) throw new Error(`ランク ${rank} の問題がありません`);
}
if (ranks.length !== order.length) throw new Error(`問題数が ${ranks.length} 問です(6問必要)`);

const sql = [header, ...problems.map(problemSql)].join('\n');
const total = problems.reduce((n, p) => n + p.cases.length, 0);

if (CHECK_ONLY) {
  // problems.mjs を編集して seed.sql の再生成を忘れたまま commit されるのを検出する。
  let current = null;
  try {
    current = readFileSync(SEED_PATH, 'utf8');
  } catch (e) {
    console.error(`${SEED_PATH} を読めませんでした。`);
    console.error(e);
    process.exit(1);
  }
  if (current !== sql) {
    console.error(
      'seed.sql が problems.mjs から生成される内容と一致しません。' +
        '`node supabase/tools/build-seed.mjs` を実行して結果をコミットしてください。',
    );
    process.exit(1);
  }
  console.log(`seed.sql は最新です: ${problems.length} 問 / テストケース ${total} 件(検証済み)`);
} else {
  writeFileSync(SEED_PATH, sql);
  console.log(`seed.sql を生成しました: ${problems.length} 問 / テストケース ${total} 件(検証済み)`);
}
