// AI へのプロンプト定義(日本語)
import type { Rank } from './constants.js';
import type { Theme, ThemeProblem } from './schemas.js';

/** ランクごとの難易度指針 */
export const DIFFICULTY_GUIDE: Record<Rank, string> = {
  E: 'ループと条件分岐だけで解ける入門問題',
  D: '累積和や全探索を使う問題',
  C: '基本的な DP や二分探索を使う問題',
  B: 'グラフ探索(BFS/DFS)や、正当性の証明が必要な貪欲法を使う問題',
  A: 'セグメント木や高度な DP を使う問題',
  S: '複数のアルゴリズムを組み合わせる複合的な難問',
};

const difficultyGuideList = (Object.entries(DIFFICULTY_GUIDE) as [Rank, string][])
  .map(([rank, guide]) => `- ${rank}: ${guide}`)
  .join('\n');

export const THEME_SYSTEM = [
  'あなたは「RaidCoder」(競技プログラミングの非同期協力型レイドゲーム)の作問責任者AIです。',
  '毎週、レイドボス1体と、ランク S/A/B/C/D/E の問題6問のテーマを設計します。',
  '出力は必ず指定された JSON のみとし、JSON 以外の説明文を書かないでください。',
].join('\n');

export function buildThemeUserPrompt(weekNumber: number): string {
  return `第 ${weekNumber} 週のレイドボスと、問題6問のテーマを設計してください。

## ボス
- boss_name: 日本語のボス名。RPG 風で、少し茶目っ気のある名前にすること
- boss_flavor: ボスのフレーバーテキスト(日本語、2〜4文)。RPG 風の口上や設定にユーモアを添えること

## 問題(6問、各ランク1問ずつ)
各問題について rank / title / topic(アルゴリズム分野)/ outline(問題の方向性、2〜3文)を出すこと。

難易度指針:
${difficultyGuideList}

制約:
- 6問の topic(分野)が週の中で重複しないこと(similar な分野も避ける)
- title は日本語で、ボスや週の世界観と軽く関連づけること

## 出力形式(この JSON のみを出力)
\`\`\`json
{
  "boss_name": "...",
  "boss_flavor": "...",
  "problems": [
    { "rank": "S", "title": "...", "topic": "...", "outline": "..." },
    { "rank": "A", "title": "...", "topic": "...", "outline": "..." },
    { "rank": "B", "title": "...", "topic": "...", "outline": "..." },
    { "rank": "C", "title": "...", "topic": "...", "outline": "..." },
    { "rank": "D", "title": "...", "topic": "...", "outline": "..." },
    { "rank": "E", "title": "...", "topic": "...", "outline": "..." }
  ]
}
\`\`\``;
}

export const PROBLEM_SYSTEM = [
  'あなたは競技プログラミングの作問AIです。',
  'AtCoder 形式(標準入力から読み、標準出力へ出力)の問題を1問、完全な形で作成します。',
  '出力は必ず指定された JSON のみとし、JSON 以外の説明文を書かないでください(\`\`\`json フェンスで囲むのは可)。',
].join('\n');

export function buildProblemUserPrompt(
  theme: Theme,
  outline: ThemeProblem,
  previousError?: string,
): string {
  const retrySection = previousError
    ? `\n## 前回の失敗\n前回生成した問題は、次の理由で検証に失敗しました。原因を修正した問題一式を出力してください:\n${previousError}\n`
    : '';

  return `以下のテーマに沿って、競技プログラミングの問題を1問、完全な形で作成してください。

## 週テーマ
- ボス: ${theme.boss_name}
- 対象問題: ランク ${outline.rank}「${outline.title}」
- アルゴリズム分野: ${outline.topic}
- 概要: ${outline.outline}
- 難易度指針: ${DIFFICULTY_GUIDE[outline.rank]}

## 要求する成果物
1. statement_md: 問題文(日本語 Markdown)。数式は KaTeX($...$)を使ってよい。
   必ず「問題文」「制約」「入力」「出力」「入出力例」のセクションを含め、入力形式と制約を明確に書くこと。
2. time_limit_ms: 実行時間制限(ミリ秒、500〜10000、通常は 2000)。
   想定解(Python)が最大ケースでもこの制限内に収まるように設定すること。
3. samples: 入出力例を2件以上。statement_md 中の入出力例と完全に一致させること。
4. case_generator_py: テストケース生成スクリプト(Python 3.8、標準ライブラリのみ)。
   - 標準入力から seed(整数1行)を読み取る
   - random.seed(seed) を使い、同じ seed なら必ず同じ入力を出力する(決定的)
   - seed 1〜3: 小さいケース / seed 4〜7: 中規模ケース / seed 8〜10: 制約最大級のケース を出し分ける
   - 出力は問題の入力形式に厳密に従い、制約を必ず満たすこと
5. official_solution_py: 想定解(Python 3.8、標準ライブラリのみ)。
   標準入力から読み、標準出力へ答えのみを出力する。最大ケースでも time_limit_ms 内に完走すること
   (Python の速度を考慮し、sys.stdin による高速入力などで最適化すること)。
6. editorial_md: 解説(日本語 Markdown)。解法のアイデア・正当性・計算量を説明すること。

## 注意
- Python 3.8 で動作すること(外部ライブラリ禁止)
- 深い再帰が必要なら sys.setrecursionlimit の設定か反復への書き換えを行うこと
- 出力の形式(改行・空白)は samples と厳密に一致させること
- 答えが一意に定まる問題にすること(スペシャルジャッジは使えない)
${retrySection}
## 出力形式(この JSON のみを出力。文字列内の改行は \\n でエスケープすること)
\`\`\`json
{
  "statement_md": "...",
  "time_limit_ms": 2000,
  "samples": [
    { "input": "...", "output": "..." },
    { "input": "...", "output": "..." }
  ],
  "case_generator_py": "...",
  "official_solution_py": "...",
  "editorial_md": "..."
}
\`\`\``;
}
