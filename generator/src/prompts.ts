// AI へのプロンプト定義(日本語)
import type { BossCharacter } from './characters.js';
import type { Rank } from './constants.js';
import type { Theme, ThemeProblem } from './schemas.js';
import { PARAM_TYPES, RETURN_TYPES, WIRE_FORMAT_DOC } from './signature.js';

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

export function buildThemeUserPrompt(weekNumber: number, character: BossCharacter): string {
  return `第 ${weekNumber} 週のレイドボスと、問題6問のテーマを設計してください。

## 今週のボスキャラクター(固定・変更不可)
- 役割: ${character.role}
- モチーフツール: ${character.tool}
- 姿: ${character.creature}

## ボス
- boss_name: 上記キャラクターのボスとしての名前(日本語カタカナ中心)。
  モチーフツール名をもじった、キャラクターの姿に合う強そうな名前にすること
  (例: Docker のクジラなら「ドックジラ」のような方向性。この例は使わないこと)
- boss_flavor: ボスの口上(日本語、2〜4文)。
  **モチーフツール「${character.tool}」の開発者やヘビーユーザーが言いそうなセリフ・あるあるネタ**を
  ボスの脅し文句に混ぜること(例: Docker なら「俺の環境では動く」など)。
  ツールを知らない人にも雰囲気が伝わる文にすること

## 問題(6問、各ランク1問ずつ)
各問題について rank / title / topic(アルゴリズム分野)/ outline(問題の方向性、2〜3文)を出すこと。

難易度指針:
${difficultyGuideList}

制約:
- 6問の topic(分野)が週の中で重複しないこと(similar な分野も避ける)
- title は**平易で内容がそのまま分かる普通の日本語タイトル**にすること
  (例: 「二数の和」「最長の連続部分配列」)。ボスや世界観との関連付けは不要

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
  'LeetCode 形式(ユーザーが関数1つを実装し、ジャッジ側ハーネスが入出力を担う)の問題を1問、完全な形で作成します。',
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

  return `以下のテーマに沿って、LeetCode 形式の問題を1問、完全な形で作成してください。

## 週テーマ
- ボス: ${theme.boss_name}
- 対象問題: ランク ${outline.rank}「${outline.title}」
- アルゴリズム分野: ${outline.topic}
- 概要: ${outline.outline}
- 難易度指針: ${DIFFICULTY_GUIDE[outline.rank]}

## 形式の前提
ユーザーは関数を1つ実装するだけで、標準入出力のコードは書きません。
テストケースは次の「ワイヤ形式」で保存され、ジャッジ側の自動生成ハーネスが
パース・関数呼び出し・出力を行います:

${WIRE_FORMAT_DOC}

## 要求する成果物
1. signature: 関数シグネチャ。
   - function_name: lowerCamelCase の英語関数名
   - params: 1〜6個。type は ${PARAM_TYPES.join(' / ')} のいずれか
   - returns: ${RETURN_TYPES.join(' / ')} のいずれか
   - 数値は 64bit 符号付き整数に収まり、かつ絶対値 9×10^15 以下になる制約にすること
   - 浮動小数点数を答えにする問題は禁止(答えが一意に定まらないため)
2. statement_md: 問題文(日本語 Markdown)。LeetCode スタイルで次の構成にすること:
   - 冒頭: 引数(param 名を \`nums\` のようにコードスパンで参照)を受け取り何を返すかの説明。
     数式は KaTeX($...$)を使ってよい
   - "## 例" セクション: 例を2つ以上。各例は次の形式のコードブロックで書く:
     \`\`\`
     入力: nums = [1,2,3], k = 2
     出力: 5
     説明: ...(説明が自明なら省略可)
     \`\`\`
   - "## 制約" セクション: 各引数の範囲を箇条書き(例: \`1 <= nums.length <= 10^5\`)
   - 入力の読み方・出力の書き方(stdin/stdout)には一切言及しないこと
3. time_limit_ms: 実行時間制限(ミリ秒、500〜10000、通常は 2000)。
   想定解(Python)が最大ケースでもこの制限内に収まるように設定すること。
4. samples: statement_md の例と同じ内容を**ワイヤ形式**で2件以上。
   input は引数を宣言順にシリアライズした文字列、output は戻り値をシリアライズした文字列。
   statement_md の例と値を完全に一致させること。
5. case_generator_py: テストケース生成スクリプト(Python 3.8、標準ライブラリのみ)。
   - 標準入力から seed(整数1行)を読み取る
   - random.seed(seed) を使い、同じ seed なら必ず同じ入力を出力する(決定的)
   - seed 1〜3: 小さいケース / seed 4〜7: 中規模ケース / seed 8〜10: 制約最大級のケース を出し分ける
   - 出力は**ワイヤ形式の引数シリアライズ**に厳密に従い、制約を必ず満たすこと
6. official_solution_py: 想定解(Python 3.8、標準ライブラリのみ)。
   \`class Solution:\` に signature どおりのメソッドを実装すること。
   **標準入出力のコードは書かないこと**(ジャッジ側ハーネスが呼び出す)。
   最大ケースでも time_limit_ms 内に完走すること(Python の速度を考慮して最適化すること)。
7. editorial_md: 解説(日本語 Markdown)。解法のアイデア・正当性・計算量を説明すること。

## 注意
- Python 3.8 で動作すること(外部ライブラリ禁止。typing.List は使用可)
- 深い再帰が必要なら sys.setrecursionlimit の設定か反復への書き換えを行うこと
- 答えが一意に定まる問題にすること(スペシャルジャッジは使えない)
- 「複数の正解のうちどれを返してもよい」形式は禁止
${retrySection}
## 出力形式(この JSON のみを出力。文字列内の改行は \\n でエスケープすること)
\`\`\`json
{
  "statement_md": "...",
  "signature": {
    "function_name": "maxSubarraySum",
    "params": [
      { "name": "nums", "type": "int[]" },
      { "name": "k", "type": "int" }
    ],
    "returns": "int"
  },
  "time_limit_ms": 2000,
  "samples": [
    { "input": "3\\n1 2 3\\n2\\n", "output": "5\\n" },
    { "input": "...", "output": "..." }
  ],
  "case_generator_py": "...",
  "official_solution_py": "...",
  "editorial_md": "..."
}
\`\`\``;
}
