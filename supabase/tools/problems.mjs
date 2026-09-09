// チュートリアル週(supabase/seed.sql)の問題定義。
//
// 形式は generator が生成する本番の問題と同じ LeetCode 形式(CONTRACT §1):
// ユーザーは関数1つを実装し、テストケースの入出力は signature.ts のワイヤ形式で保存する。
// code_templates / judge_harnesses は署名から codegen.ts が決定的に生成するため、ここには書かない。
//
// base_damage は CONTRACT §3 の値(E=500 / D=1000 / C=2000 / B=3500 / A=5500 / S=8500)。

/**
 * @typedef {object} SeedProblem
 * @property {string} rank
 * @property {string} id            problems.id (固定 UUID。末尾はランクの並び順 S=1 … E=6)
 * @property {string} title
 * @property {number} baseDamage
 * @property {number} timeLimitMs
 * @property {object} signature     codegen.ts に渡す関数シグネチャ
 * @property {string} statementMd
 * @property {{name: string, input: string, output: string, isSample: boolean}[]} cases
 *           input / output は signature.ts のワイヤ形式
 * @property {string} solutionPy    公式解(class Solution。標準入出力は書かない)
 * @property {string} brutePy       検証専用の素朴な別解(seed.sql には入らない)
 * @property {string} editorialMd
 */

/** @type {SeedProblem[]} */
export const PROBLEMS = [
  {
    rank: 'E',
    id: 'aaaaaaaa-0000-0000-0000-000000000006',
    title: '二数の和',
    baseDamage: 500,
    timeLimitMs: 2000,
    signature: {
      function_name: 'sumTwo',
      params: [
        { name: 'a', type: 'int' },
        { name: 'b', type: 'int' },
      ],
      returns: 'int',
    },
    statementMd: `整数 \`a\`, \`b\` が与えられます。\`a + b\` を返してください。

## 例

\`\`\`
入力: a = 3, b = 5
出力: 8
\`\`\`

\`\`\`
入力: a = -1000000000, b = 1000000000
出力: 0
\`\`\`

## 制約

- $-10^9 \\le a \\le 10^9$
- $-10^9 \\le b \\le 10^9$`,
    cases: [
      { name: 'sample_1', input: '3\n5\n', output: '8\n', isSample: true },
      { name: 'sample_2', input: '-1000000000\n1000000000\n', output: '0\n', isSample: true },
      { name: 'hidden_1', input: '0\n0\n', output: '0\n', isSample: false },
      { name: 'hidden_2', input: '123456789\n987654321\n', output: '1111111110\n', isSample: false },
      { name: 'hidden_3', input: '-5\n-7\n', output: '-12\n', isSample: false },
      { name: 'hidden_4', input: '1\n999999999\n', output: '1000000000\n', isSample: false },
    ],
    solutionPy: `class Solution:
    def sumTwo(self, a: int, b: int) -> int:
        return a + b`,
    brutePy: `class Solution:
    def sumTwo(self, a: int, b: int) -> int:
        s = a
        step = 1 if b >= 0 else -1
        for _ in range(abs(b)):
            s += step
        return s`,
    editorialMd: `2 つの整数を足して返すだけです。

Python の整数は多倍長のためオーバーフローしませんが、Rust / Java / TypeScript では
$|a|, |b| \\le 10^9$ より和は最大 $2 \\times 10^9$ となり 32bit 整数に収まりません。
64bit 整数(\`i64\` / \`long\`)を使ってください。TypeScript の \`number\` は
$2^{53}$ まで正確なのでそのまま扱えます。

計算量は $O(1)$ です。`,
  },

  {
    rank: 'D',
    id: 'aaaaaaaa-0000-0000-0000-000000000005',
    title: '偶数の総和',
    baseDamage: 1000,
    timeLimitMs: 2000,
    signature: {
      function_name: 'sumEvenNumbers',
      params: [{ name: 'nums', type: 'int[]' }],
      returns: 'int',
    },
    statementMd: `整数の配列 \`nums\` が与えられます。\`nums\` の要素のうち **偶数** であるものの総和を返してください。
偶数が 1 つも無い場合は $0$ を返してください。

## 例

\`\`\`
入力: nums = [1,2,3,4,5]
出力: 6
説明: 偶数は 2 と 4 で、和は 6 です。
\`\`\`

\`\`\`
入力: nums = [1,3,5]
出力: 0
説明: 偶数がないため 0 を返します。
\`\`\`

## 制約

- $1 \\le$ \`nums.length\` $\\le 10^5$
- $-10^9 \\le$ \`nums[i]\` $\\le 10^9$`,
    cases: [
      { name: 'sample_1', input: '5\n1 2 3 4 5\n', output: '6\n', isSample: true },
      { name: 'sample_2', input: '3\n1 3 5\n', output: '0\n', isSample: true },
      { name: 'hidden_1', input: '4\n2 4 6 8\n', output: '20\n', isSample: false },
      { name: 'hidden_2', input: '1\n-2\n', output: '-2\n', isSample: false },
      { name: 'hidden_3', input: '6\n0 1 -4 7 10 3\n', output: '6\n', isSample: false },
      { name: 'hidden_4', input: '2\n1000000000 999999999\n', output: '1000000000\n', isSample: false },
    ],
    solutionPy: `from typing import List


class Solution:
    def sumEvenNumbers(self, nums: List[int]) -> int:
        return sum(x for x in nums if x % 2 == 0)`,
    brutePy: `from typing import List


class Solution:
    def sumEvenNumbers(self, nums: List[int]) -> int:
        total = 0
        for x in nums:
            if abs(x) % 2 == 0:
                total += x
        return total`,
    editorialMd: `先頭から順に見て、偶数だけを足し合わせます。

負の数の判定に注意してください。言語によって剰余の符号が異なり、C 系の言語では
\`-3 % 2\` が $-1$ になります。\`x % 2 == 0\` は符号によらず偶数判定として正しく働きますが、
\`x % 2 == 1\` で奇数を判定すると負の奇数を取りこぼします。

計算量は $O(N)$ です。`,
  },

  {
    rank: 'C',
    id: 'aaaaaaaa-0000-0000-0000-000000000004',
    title: '最大の連続部分列和',
    baseDamage: 2000,
    timeLimitMs: 2000,
    signature: {
      function_name: 'maxSubarraySum',
      params: [{ name: 'nums', type: 'int[]' }],
      returns: 'int',
    },
    statementMd: `整数の配列 \`nums\` が与えられます。\`nums\` の **空でない連続部分列** の総和として
考えられる最大値を返してください。

## 例

\`\`\`
入力: nums = [1,-2,3,4,-1]
出力: 7
説明: [3,4] を選ぶと和が 7 になり、これが最大です。
\`\`\`

\`\`\`
入力: nums = [-5,-1,-3]
出力: -1
説明: すべて負のため、要素 1 つだけの [-1] が最大になります。
\`\`\`

## 制約

- $1 \\le$ \`nums.length\` $\\le 2 \\times 10^5$
- $-10^9 \\le$ \`nums[i]\` $\\le 10^9$`,
    cases: [
      { name: 'sample_1', input: '5\n1 -2 3 4 -1\n', output: '7\n', isSample: true },
      { name: 'sample_2', input: '3\n-5 -1 -3\n', output: '-1\n', isSample: true },
      { name: 'hidden_1', input: '6\n2 -1 2 3 -9 4\n', output: '6\n', isSample: false },
      { name: 'hidden_2', input: '1\n-100\n', output: '-100\n', isSample: false },
      { name: 'hidden_3', input: '8\n-2 1 -3 4 -1 2 1 -5\n', output: '6\n', isSample: false },
      { name: 'hidden_4', input: '4\n5 5 5 5\n', output: '20\n', isSample: false },
    ],
    solutionPy: `from typing import List


class Solution:
    def maxSubarraySum(self, nums: List[int]) -> int:
        best = cur = nums[0]
        for x in nums[1:]:
            cur = max(x, cur + x)
            best = max(best, cur)
        return best`,
    brutePy: `from typing import List


class Solution:
    def maxSubarraySum(self, nums: List[int]) -> int:
        n = len(nums)
        best = nums[0]
        for i in range(n):
            total = 0
            for j in range(i, n):
                total += nums[j]
                if total > best:
                    best = total
        return best`,
    editorialMd: `Kadane 法(区間の右端を固定する DP)を使います。

$dp_i$ を「$i$ 番目の要素で終わる連続部分列の和の最大値」とすると、
$dp_i = \\max(nums_i,\\ dp_{i-1} + nums_i)$ が成り立ちます。
直前までの和が負なら捨てて $nums_i$ から始め直した方が得だからです。
答えは $\\max_i dp_i$ です。

空の部分列は選べないため、全要素が負のときの答えは最大の要素そのものになります。
初期値を $0$ にすると誤答になるので注意してください。

計算量は $O(N)$、追加メモリは $O(1)$ です。`,
  },

  {
    rank: 'B',
    id: 'aaaaaaaa-0000-0000-0000-000000000003',
    title: '重ならない区間の最大個数',
    baseDamage: 3500,
    timeLimitMs: 2000,
    signature: {
      function_name: 'maxNonOverlappingIntervals',
      params: [{ name: 'intervals', type: 'int[][]' }],
      returns: 'int',
    },
    statementMd: `区間の配列 \`intervals\` が与えられます。\`intervals[i]\` は $2$ 要素 $[start_i, end_i]$ で、
$start_i$ 時刻に始まり $end_i$ 時刻に終わる区間を表します。

互いに重ならないように区間を選ぶとき、選べる区間の最大個数を返してください。
ある区間の終了時刻と別の区間の開始時刻が等しい場合は、重なっていないものとして両方選べます。

## 例

\`\`\`
入力: intervals = [[1,3],[2,5],[4,7]]
出力: 2
説明: [1,3] と [4,7] を選べます。[2,5] はどちらとも重なります。
\`\`\`

\`\`\`
入力: intervals = [[1,2],[2,3],[3,4]]
出力: 3
説明: 終了時刻と開始時刻が等しいものは重ならないため、すべて選べます。
\`\`\`

## 制約

- $1 \\le$ \`intervals.length\` $\\le 10^5$
- \`intervals[i].length\` $= 2$
- $0 \\le start_i < end_i \\le 10^9$`,
    cases: [
      {
        name: 'sample_1',
        input: '3\n2 1 3\n2 2 5\n2 4 7\n',
        output: '2\n',
        isSample: true,
      },
      {
        name: 'sample_2',
        input: '3\n2 1 2\n2 2 3\n2 3 4\n',
        output: '3\n',
        isSample: true,
      },
      { name: 'hidden_1', input: '1\n2 0 1000000000\n', output: '1\n', isSample: false },
      {
        name: 'hidden_2',
        input: '4\n2 1 10\n2 2 3\n2 3 4\n2 4 5\n',
        output: '3\n',
        isSample: false,
      },
      {
        name: 'hidden_3',
        input: '5\n2 5 6\n2 1 3\n2 2 8\n2 3 5\n2 7 9\n',
        output: '4\n',
        isSample: false,
      },
      {
        name: 'hidden_4',
        input: '4\n2 1 4\n2 2 4\n2 3 4\n2 1 4\n',
        output: '1\n',
        isSample: false,
      },
    ],
    solutionPy: `from typing import List


class Solution:
    def maxNonOverlappingIntervals(self, intervals: List[List[int]]) -> int:
        count = 0
        last_end = None
        for start, end in sorted(intervals, key=lambda v: v[1]):
            if last_end is None or start >= last_end:
                count += 1
                last_end = end
        return count`,
    brutePy: `from typing import List


class Solution:
    def maxNonOverlappingIntervals(self, intervals: List[List[int]]) -> int:
        # 終了時刻順に並べた上での O(N^2) DP(貪欲法の正当性を確認するための素朴解)
        items = sorted(intervals, key=lambda v: v[1])
        n = len(items)
        best = [1] * n
        for i in range(n):
            for j in range(i):
                if items[j][1] <= items[i][0] and best[j] + 1 > best[i]:
                    best[i] = best[j] + 1
        return max(best)`,
    editorialMd: `終了時刻の早い区間から貪欲に選びます。

区間を終了時刻の昇順に並べ、直前に選んだ区間の終了時刻 \`last_end\` を持ちながら
先頭から順に見て、\`start >= last_end\` なら選び \`last_end\` を更新します。

**正当性**: 最適解の中で最初に終わる区間を $x$、貪欲法が選ぶ最初の区間を $g$ とすると、
$g$ は全区間の中で終了時刻が最小なので $end_g \\le end_x$ です。よって最適解の $x$ を $g$ に
置き換えても他の区間と重ならず、個数も変わりません。以降も同じ議論を繰り返せるため、
貪欲法の解は必ず最適解と同じ個数になります。

開始時刻の昇順や区間の長さの昇順で選ぶと反例があります(例: \`[[1,10],[2,3],[3,4]]\`)。

計算量はソートが支配的で $O(N \\log N)$ です。`,
  },

  {
    rank: 'A',
    id: 'aaaaaaaa-0000-0000-0000-000000000002',
    title: '最長増加部分列の長さ',
    baseDamage: 5500,
    timeLimitMs: 2000,
    signature: {
      function_name: 'lengthOfLIS',
      params: [{ name: 'nums', type: 'int[]' }],
      returns: 'int',
    },
    statementMd: `整数の配列 \`nums\` が与えられます。\`nums\` から要素をいくつか取り出して(順序は変えずに)
作れる **狭義単調増加** な部分列のうち、最長のものの長さを返してください。

部分列は連続していなくてもかまいません。狭義単調増加とは、隣り合う要素が常に
前 $<$ 後 を満たすことを指します。

## 例

\`\`\`
入力: nums = [10,9,2,5,3,7,101,18]
出力: 4
説明: [2,3,7,101] が最長で、長さは 4 です。
\`\`\`

\`\`\`
入力: nums = [7,7,7,7]
出力: 1
説明: 同じ値は増加していないため、長さは 1 です。
\`\`\`

## 制約

- $1 \\le$ \`nums.length\` $\\le 2 \\times 10^5$
- $-10^9 \\le$ \`nums[i]\` $\\le 10^9$`,
    cases: [
      { name: 'sample_1', input: '8\n10 9 2 5 3 7 101 18\n', output: '4\n', isSample: true },
      { name: 'sample_2', input: '4\n7 7 7 7\n', output: '1\n', isSample: true },
      { name: 'hidden_1', input: '5\n1 2 3 4 5\n', output: '5\n', isSample: false },
      { name: 'hidden_2', input: '5\n5 4 3 2 1\n', output: '1\n', isSample: false },
      {
        name: 'hidden_3',
        input: '12\n0 8 4 12 2 10 6 14 1 9 5 13\n',
        output: '5\n',
        isSample: false,
      },
      { name: 'hidden_4', input: '7\n-5 -1 -3 0 2 -2 3\n', output: '5\n', isSample: false },
    ],
    solutionPy: `import bisect
from typing import List


class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        tails = []
        for x in nums:
            i = bisect.bisect_left(tails, x)
            if i == len(tails):
                tails.append(x)
            else:
                tails[i] = x
        return len(tails)`,
    brutePy: `from typing import List


class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        # O(N^2) DP(二分探索版の答え合わせ用)
        n = len(nums)
        dp = [1] * n
        for i in range(n):
            for j in range(i):
                if nums[j] < nums[i] and dp[j] + 1 > dp[i]:
                    dp[i] = dp[j] + 1
        return max(dp)`,
    editorialMd: `$O(N^2)$ の DP(「$i$ 番目で終わる最長増加部分列の長さ」)は $N \\le 2 \\times 10^5$ では
間に合わないため、二分探索で $O(N \\log N)$ にします。

配列 \`tails\` を「長さ $k+1$ の増加部分列の末尾としてあり得る最小値」を
\`tails[k]\` に持つものとして管理します。\`tails\` は常に狭義単調増加になります。

各要素 $x$ について \`tails\` 内で $x$ 以上となる最初の位置を二分探索し、

- その位置が末尾を超えていれば \`tails\` に $x$ を追加(最長長さが 1 伸びる)
- そうでなければその位置を $x$ で上書き(同じ長さをより小さい末尾で達成できる)

とします。最後の \`tails\` の長さが答えです。\`tails\` 自体は最長増加部分列そのものとは
限らない点に注意してください(長さだけが正しい)。

広義単調増加(同じ値を許す)を求める場合は、二分探索を \`bisect_right\` 相当に変えます。

計算量は $O(N \\log N)$ です。`,
  },

  {
    rank: 'S',
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    title: '最大の長方形',
    baseDamage: 8500,
    timeLimitMs: 2000,
    signature: {
      function_name: 'maxRectangleArea',
      params: [{ name: 'grid', type: 'str[]' }],
      returns: 'int',
    },
    statementMd: `\`0\` と \`1\` だけからなる同じ長さの文字列の配列 \`grid\` が与えられます。
\`grid[i][j]\` はマス $(i, j)$ の値を表します。

すべてのマスが \`1\` であるような軸に平行な長方形のうち、面積(含まれるマスの個数)が
最大のものを求め、その面積を返してください。\`1\` のマスが 1 つも無い場合は $0$ を返してください。

## 例

\`\`\`
入力: grid = ["10100","10111","11111","10010"]
出力: 6
説明: 3 行目を下辺、2〜3 行目・右から 3 列分を使う 2×3 の長方形が最大です。
\`\`\`

\`\`\`
入力: grid = ["0"]
出力: 0
説明: 1 のマスがありません。
\`\`\`

## 制約

- $1 \\le$ \`grid.length\` $\\le 200$
- $1 \\le$ \`grid[i].length\` $\\le 200$
- \`grid\` の各要素の長さは等しい
- \`grid[i][j]\` は \`0\` または \`1\``,
    cases: [
      {
        name: 'sample_1',
        input: '4\n10100\n10111\n11111\n10010\n',
        output: '6\n',
        isSample: true,
      },
      { name: 'sample_2', input: '1\n0\n', output: '0\n', isSample: true },
      { name: 'hidden_1', input: '2\n11\n11\n', output: '4\n', isSample: false },
      {
        name: 'hidden_2',
        input: '4\n0110\n1111\n1111\n0110\n',
        output: '8\n',
        isSample: false,
      },
      { name: 'hidden_3', input: '1\n1\n', output: '1\n', isSample: false },
      { name: 'hidden_4', input: '3\n101\n111\n101\n', output: '3\n', isSample: false },
    ],
    solutionPy: `from typing import List


class Solution:
    def maxRectangleArea(self, grid: List[str]) -> int:
        width = len(grid[0])
        heights = [0] * width
        best = 0
        for row in grid:
            for j in range(width):
                heights[j] = heights[j] + 1 if row[j] == '1' else 0
            best = max(best, self._largest_in_histogram(heights))
        return best

    def _largest_in_histogram(self, heights: List[int]) -> int:
        stack = []  # 高さが単調増加になるように保つインデックスのスタック
        best = 0
        for i, h in enumerate(heights + [0]):
            while stack and heights[stack[-1]] >= h:
                top = stack.pop()
                left = stack[-1] + 1 if stack else 0
                best = max(best, heights[top] * (i - left))
            stack.append(i)
        return best`,
    brutePy: `from typing import List


class Solution:
    def maxRectangleArea(self, grid: List[str]) -> int:
        # 上下左右の境界を全探索する O(H^2 W^2) の素朴解(小さいケースの答え合わせ用)
        h = len(grid)
        w = len(grid[0])
        ones = [[1 if grid[i][j] == '1' else 0 for j in range(w)] for i in range(h)]
        # 二次元累積和
        acc = [[0] * (w + 1) for _ in range(h + 1)]
        for i in range(h):
            for j in range(w):
                acc[i + 1][j + 1] = ones[i][j] + acc[i][j + 1] + acc[i + 1][j] - acc[i][j]
        best = 0
        for top in range(h):
            for bottom in range(top, h):
                for left in range(w):
                    for right in range(left, w):
                        area = (bottom - top + 1) * (right - left + 1)
                        total = (
                            acc[bottom + 1][right + 1]
                            - acc[top][right + 1]
                            - acc[bottom + 1][left]
                            + acc[top][left]
                        )
                        if total == area and area > best:
                            best = area
        return best`,
    editorialMd: `1 行ずつ下に降りながら「各列について、その行を下端としたときに上へ連続する \`1\` の個数」を
ヒストグラムの高さとして更新し、各行でヒストグラム内の最大長方形を求めます。
2 つのアルゴリズム(列ごとの DP と、ヒストグラムの最大長方形)の組み合わせです。

**高さの更新**: \`grid[i][j] == '1'\` なら \`heights[j] += 1\`、\`0\` なら \`heights[j] = 0\`。

**ヒストグラム内の最大長方形**: 高さが単調増加になるようにインデックスを積む
スタック(単調スタック)を使い、より低い高さが来たときに積まれた棒を取り出して
「その棒の高さ $\\times$ 伸ばせる幅」を計算します。各棒はスタックに 1 回だけ入って
1 回だけ出るため、1 行あたり $O(W)$ で求まります。番兵として末尾に高さ $0$ を
足しておくと、最後にスタックへ残る棒も同じ処理で回収できます。

全体の計算量は $O(HW)$ です。マス目の全探索($O(H^2W^2)$)は
$H, W \\le 200$ では間に合いません。`,
  },
];
