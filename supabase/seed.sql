-- ローカル開発用シード: チュートリアル週(AI生成なしで一通り遊べる)
-- 本番では generator が毎週これに相当するデータを生成する。
--
-- このファイルは自動生成される。直接編集せず、supabase/tools/problems.mjs を編集して
--   cd generator && npm run build && node supabase/tools/build-seed.mjs
-- を実行し直すこと(生成時に公式解を python3 で全テストケース検証している)。
--
-- 問題は本番と同じ LeetCode 形式(CONTRACT §1)。ランクは S/A/B/C/D/E の6問で、
-- base_damage は CONTRACT §3 の値。

insert into public.raid_weeks
  (id, week_number, starts_at, ends_at, boss_name, boss_flavor, boss_max_hp, boss_hp, status)
values (
  '11111111-1111-1111-1111-111111111111',
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

-- ============ E: 二数の和 ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage,
   signature, code_templates, judge_harnesses)
values (
  E'aaaaaaaa-0000-0000-0000-000000000006',
  E'11111111-1111-1111-1111-111111111111',
  E'E',
  E'二数の和',
  E'整数 `a`, `b` が与えられます。`a + b` を返してください。\n\n## 例\n\n```\n入力: a = 3, b = 5\n出力: 8\n```\n\n```\n入力: a = -1000000000, b = 1000000000\n出力: 0\n```\n\n## 制約\n\n- $-10^9 \\le a \\le 10^9$\n- $-10^9 \\le b \\le 10^9$',
  2000, 262144, 500,
  E'{"function_name":"sumTwo","params":[{"name":"a","type":"int"},{"name":"b","type":"int"}],"returns":"int"}'::jsonb,
  E'{"python":"class Solution:\\n    def sumTwo(self, a: int, b: int) -> int:\\n        # ここに解答を書く\\n        pass\\n","rust":"impl Solution {\\n    pub fn sum_two(a: i64, b: i64) -> i64 {\\n        // ここに解答を書く\\n        0\\n    }\\n}\\n","typescript":"function sumTwo(a: number, b: number): number {\\n    // ここに解答を書く\\n    return 0;\\n}\\n","java":"class Solution {\\n    public long sumTwo(long a, long b) {\\n        // ここに解答を書く\\n        return 0;\\n    }\\n}\\n"}'::jsonb,
  E'{"python":"\\n\\n# --- RaidCoder judge harness (auto-generated) ---\\nimport sys\\n\\n\\ndef _rc_main():\\n    _lines = sys.stdin.read().split(\\"\\\\n\\")\\n    _i = 0\\n    a = int(_lines[_i]); _i += 1\\n    b = int(_lines[_i]); _i += 1\\n    _res = Solution().sumTwo(a, b)\\n    print(_res)\\n\\n\\n_rc_main()\\n","rust":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\nstruct Solution;\\n\\nfn main() {\\n    use std::io::Read;\\n    let mut _s = String::new();\\n    std::io::stdin().read_to_string(&mut _s).unwrap();\\n    let mut _it = _s.lines();\\n    let a: i64 = _it.next().unwrap().trim().parse().unwrap();\\n    let b: i64 = _it.next().unwrap().trim().parse().unwrap();\\n    let _res = Solution::sum_two(a, b);\\n    println!(\\"{}\\", _res);\\n}\\n","typescript":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\n// 本番ジャッジ(素の tsc)には @types/node が無いため require を自前で宣言する\\ndeclare function require(name: string): any;\\nconst _rcLines: string[] = require(\\"fs\\").readFileSync(\\"/dev/stdin\\", \\"utf8\\").split(\\"\\\\n\\");\\nlet _rcI = 0;\\nconst a: number = parseInt(_rcLines[_rcI++], 10);\\nconst b: number = parseInt(_rcLines[_rcI++], 10);\\nconst _res = sumTwo(a, b);\\nconsole.log(String(_res));\\n","java":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\npublic class Main {\\n    public static void main(String[] _args) throws Exception {\\n        java.io.BufferedReader _br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));\\n        long a = Long.parseLong(_br.readLine().trim());\\n        long b = Long.parseLong(_br.readLine().trim());\\n        long _res = new Solution().sumTwo(a, b);\\n        System.out.println(_res);\\n    }\\n}\\n"}'::jsonb
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  (E'aaaaaaaa-0000-0000-0000-000000000006', E'sample_1', E'3\n5\n', E'8\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000006', E'sample_2', E'-1000000000\n1000000000\n', E'0\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000006', E'hidden_1', E'0\n0\n', E'0\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000006', E'hidden_2', E'123456789\n987654321\n', E'1111111110\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000006', E'hidden_3', E'-5\n-7\n', E'-12\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000006', E'hidden_4', E'1\n999999999\n', E'1000000000\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  E'aaaaaaaa-0000-0000-0000-000000000006',
  E'2 つの整数を足して返すだけです。\n\nPython の整数は多倍長のためオーバーフローしませんが、Rust / Java / TypeScript では\n$|a|, |b| \\le 10^9$ より和は最大 $2 \\times 10^9$ となり 32bit 整数に収まりません。\n64bit 整数(`i64` / `long`)を使ってください。TypeScript の `number` は\n$2^{53}$ まで正確なのでそのまま扱えます。\n\n計算量は $O(1)$ です。',
  E'[{"language":"python","code":"class Solution:\\n    def sumTwo(self, a: int, b: int) -> int:\\n        return a + b"}]'::jsonb
);

-- ============ D: 偶数の総和 ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage,
   signature, code_templates, judge_harnesses)
values (
  E'aaaaaaaa-0000-0000-0000-000000000005',
  E'11111111-1111-1111-1111-111111111111',
  E'D',
  E'偶数の総和',
  E'整数の配列 `nums` が与えられます。`nums` の要素のうち **偶数** であるものの総和を返してください。\n偶数が 1 つも無い場合は $0$ を返してください。\n\n## 例\n\n```\n入力: nums = [1,2,3,4,5]\n出力: 6\n説明: 偶数は 2 と 4 で、和は 6 です。\n```\n\n```\n入力: nums = [1,3,5]\n出力: 0\n説明: 偶数がないため 0 を返します。\n```\n\n## 制約\n\n- $1 \\le$ `nums.length` $\\le 10^5$\n- $-10^9 \\le$ `nums[i]` $\\le 10^9$',
  2000, 262144, 1000,
  E'{"function_name":"sumEvenNumbers","params":[{"name":"nums","type":"int[]"}],"returns":"int"}'::jsonb,
  E'{"python":"from typing import List\\n\\n\\nclass Solution:\\n    def sumEvenNumbers(self, nums: List[int]) -> int:\\n        # ここに解答を書く\\n        pass\\n","rust":"impl Solution {\\n    pub fn sum_even_numbers(nums: Vec<i64>) -> i64 {\\n        // ここに解答を書く\\n        0\\n    }\\n}\\n","typescript":"function sumEvenNumbers(nums: number[]): number {\\n    // ここに解答を書く\\n    return 0;\\n}\\n","java":"class Solution {\\n    public long sumEvenNumbers(long[] nums) {\\n        // ここに解答を書く\\n        return 0;\\n    }\\n}\\n"}'::jsonb,
  E'{"python":"\\n\\n# --- RaidCoder judge harness (auto-generated) ---\\nimport sys\\n\\n\\ndef _rc_main():\\n    _lines = sys.stdin.read().split(\\"\\\\n\\")\\n    _i = 0\\n    _i += 1  # 要素数行は読み飛ばす\\n    nums = [int(v) for v in _lines[_i].split()]; _i += 1\\n    _res = Solution().sumEvenNumbers(nums)\\n    print(_res)\\n\\n\\n_rc_main()\\n","rust":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\nstruct Solution;\\n\\nfn main() {\\n    use std::io::Read;\\n    let mut _s = String::new();\\n    std::io::stdin().read_to_string(&mut _s).unwrap();\\n    let mut _it = _s.lines();\\n    let _ = _it.next();\\n    let nums: Vec<i64> = _it.next().unwrap().split_whitespace().map(|v| v.parse().unwrap()).collect();\\n    let _res = Solution::sum_even_numbers(nums);\\n    println!(\\"{}\\", _res);\\n}\\n","typescript":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\n// 本番ジャッジ(素の tsc)には @types/node が無いため require を自前で宣言する\\ndeclare function require(name: string): any;\\nconst _rcLines: string[] = require(\\"fs\\").readFileSync(\\"/dev/stdin\\", \\"utf8\\").split(\\"\\\\n\\");\\nlet _rcI = 0;\\n_rcI++;\\nconst nums: number[] = _rcLines[_rcI++].split(/\\\\s+/).filter(function (s) { return s.length > 0; }).map(Number);\\nconst _res = sumEvenNumbers(nums);\\nconsole.log(String(_res));\\n","java":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\npublic class Main {\\n    public static void main(String[] _args) throws Exception {\\n        java.io.BufferedReader _br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));\\n        int _n0 = Integer.parseInt(_br.readLine().trim());\\n        long[] nums = new long[_n0];\\n        java.util.StringTokenizer _st0 = new java.util.StringTokenizer(_br.readLine());\\n        for (int _i = 0; _i < _n0; _i++) nums[_i] = Long.parseLong(_st0.nextToken());\\n        long _res = new Solution().sumEvenNumbers(nums);\\n        System.out.println(_res);\\n    }\\n}\\n"}'::jsonb
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  (E'aaaaaaaa-0000-0000-0000-000000000005', E'sample_1', E'5\n1 2 3 4 5\n', E'6\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000005', E'sample_2', E'3\n1 3 5\n', E'0\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000005', E'hidden_1', E'4\n2 4 6 8\n', E'20\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000005', E'hidden_2', E'1\n-2\n', E'-2\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000005', E'hidden_3', E'6\n0 1 -4 7 10 3\n', E'6\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000005', E'hidden_4', E'2\n1000000000 999999999\n', E'1000000000\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  E'aaaaaaaa-0000-0000-0000-000000000005',
  E'先頭から順に見て、偶数だけを足し合わせます。\n\n負の数の判定に注意してください。言語によって剰余の符号が異なり、C 系の言語では\n`-3 % 2` が $-1$ になります。`x % 2 == 0` は符号によらず偶数判定として正しく働きますが、\n`x % 2 == 1` で奇数を判定すると負の奇数を取りこぼします。\n\n計算量は $O(N)$ です。',
  E'[{"language":"python","code":"from typing import List\\n\\n\\nclass Solution:\\n    def sumEvenNumbers(self, nums: List[int]) -> int:\\n        return sum(x for x in nums if x % 2 == 0)"}]'::jsonb
);

-- ============ C: 最大の連続部分列和 ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage,
   signature, code_templates, judge_harnesses)
values (
  E'aaaaaaaa-0000-0000-0000-000000000004',
  E'11111111-1111-1111-1111-111111111111',
  E'C',
  E'最大の連続部分列和',
  E'整数の配列 `nums` が与えられます。`nums` の **空でない連続部分列** の総和として\n考えられる最大値を返してください。\n\n## 例\n\n```\n入力: nums = [1,-2,3,4,-1]\n出力: 7\n説明: [3,4] を選ぶと和が 7 になり、これが最大です。\n```\n\n```\n入力: nums = [-5,-1,-3]\n出力: -1\n説明: すべて負のため、要素 1 つだけの [-1] が最大になります。\n```\n\n## 制約\n\n- $1 \\le$ `nums.length` $\\le 2 \\times 10^5$\n- $-10^9 \\le$ `nums[i]` $\\le 10^9$',
  2000, 262144, 2000,
  E'{"function_name":"maxSubarraySum","params":[{"name":"nums","type":"int[]"}],"returns":"int"}'::jsonb,
  E'{"python":"from typing import List\\n\\n\\nclass Solution:\\n    def maxSubarraySum(self, nums: List[int]) -> int:\\n        # ここに解答を書く\\n        pass\\n","rust":"impl Solution {\\n    pub fn max_subarray_sum(nums: Vec<i64>) -> i64 {\\n        // ここに解答を書く\\n        0\\n    }\\n}\\n","typescript":"function maxSubarraySum(nums: number[]): number {\\n    // ここに解答を書く\\n    return 0;\\n}\\n","java":"class Solution {\\n    public long maxSubarraySum(long[] nums) {\\n        // ここに解答を書く\\n        return 0;\\n    }\\n}\\n"}'::jsonb,
  E'{"python":"\\n\\n# --- RaidCoder judge harness (auto-generated) ---\\nimport sys\\n\\n\\ndef _rc_main():\\n    _lines = sys.stdin.read().split(\\"\\\\n\\")\\n    _i = 0\\n    _i += 1  # 要素数行は読み飛ばす\\n    nums = [int(v) for v in _lines[_i].split()]; _i += 1\\n    _res = Solution().maxSubarraySum(nums)\\n    print(_res)\\n\\n\\n_rc_main()\\n","rust":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\nstruct Solution;\\n\\nfn main() {\\n    use std::io::Read;\\n    let mut _s = String::new();\\n    std::io::stdin().read_to_string(&mut _s).unwrap();\\n    let mut _it = _s.lines();\\n    let _ = _it.next();\\n    let nums: Vec<i64> = _it.next().unwrap().split_whitespace().map(|v| v.parse().unwrap()).collect();\\n    let _res = Solution::max_subarray_sum(nums);\\n    println!(\\"{}\\", _res);\\n}\\n","typescript":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\n// 本番ジャッジ(素の tsc)には @types/node が無いため require を自前で宣言する\\ndeclare function require(name: string): any;\\nconst _rcLines: string[] = require(\\"fs\\").readFileSync(\\"/dev/stdin\\", \\"utf8\\").split(\\"\\\\n\\");\\nlet _rcI = 0;\\n_rcI++;\\nconst nums: number[] = _rcLines[_rcI++].split(/\\\\s+/).filter(function (s) { return s.length > 0; }).map(Number);\\nconst _res = maxSubarraySum(nums);\\nconsole.log(String(_res));\\n","java":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\npublic class Main {\\n    public static void main(String[] _args) throws Exception {\\n        java.io.BufferedReader _br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));\\n        int _n0 = Integer.parseInt(_br.readLine().trim());\\n        long[] nums = new long[_n0];\\n        java.util.StringTokenizer _st0 = new java.util.StringTokenizer(_br.readLine());\\n        for (int _i = 0; _i < _n0; _i++) nums[_i] = Long.parseLong(_st0.nextToken());\\n        long _res = new Solution().maxSubarraySum(nums);\\n        System.out.println(_res);\\n    }\\n}\\n"}'::jsonb
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  (E'aaaaaaaa-0000-0000-0000-000000000004', E'sample_1', E'5\n1 -2 3 4 -1\n', E'7\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000004', E'sample_2', E'3\n-5 -1 -3\n', E'-1\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000004', E'hidden_1', E'6\n2 -1 2 3 -9 4\n', E'6\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000004', E'hidden_2', E'1\n-100\n', E'-100\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000004', E'hidden_3', E'8\n-2 1 -3 4 -1 2 1 -5\n', E'6\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000004', E'hidden_4', E'4\n5 5 5 5\n', E'20\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  E'aaaaaaaa-0000-0000-0000-000000000004',
  E'Kadane 法(区間の右端を固定する DP)を使います。\n\n$dp_i$ を「$i$ 番目の要素で終わる連続部分列の和の最大値」とすると、\n$dp_i = \\max(nums_i,\\ dp_{i-1} + nums_i)$ が成り立ちます。\n直前までの和が負なら捨てて $nums_i$ から始め直した方が得だからです。\n答えは $\\max_i dp_i$ です。\n\n空の部分列は選べないため、全要素が負のときの答えは最大の要素そのものになります。\n初期値を $0$ にすると誤答になるので注意してください。\n\n計算量は $O(N)$、追加メモリは $O(1)$ です。',
  E'[{"language":"python","code":"from typing import List\\n\\n\\nclass Solution:\\n    def maxSubarraySum(self, nums: List[int]) -> int:\\n        best = cur = nums[0]\\n        for x in nums[1:]:\\n            cur = max(x, cur + x)\\n            best = max(best, cur)\\n        return best"}]'::jsonb
);

-- ============ B: 重ならない区間の最大個数 ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage,
   signature, code_templates, judge_harnesses)
values (
  E'aaaaaaaa-0000-0000-0000-000000000003',
  E'11111111-1111-1111-1111-111111111111',
  E'B',
  E'重ならない区間の最大個数',
  E'区間の配列 `intervals` が与えられます。`intervals[i]` は $2$ 要素 $[start_i, end_i]$ で、\n$start_i$ 時刻に始まり $end_i$ 時刻に終わる区間を表します。\n\n互いに重ならないように区間を選ぶとき、選べる区間の最大個数を返してください。\nある区間の終了時刻と別の区間の開始時刻が等しい場合は、重なっていないものとして両方選べます。\n\n## 例\n\n```\n入力: intervals = [[1,3],[2,5],[4,7]]\n出力: 2\n説明: [1,3] と [4,7] を選べます。[2,5] はどちらとも重なります。\n```\n\n```\n入力: intervals = [[1,2],[2,3],[3,4]]\n出力: 3\n説明: 終了時刻と開始時刻が等しいものは重ならないため、すべて選べます。\n```\n\n## 制約\n\n- $1 \\le$ `intervals.length` $\\le 10^5$\n- `intervals[i].length` $= 2$\n- $0 \\le start_i < end_i \\le 10^9$',
  2000, 262144, 3500,
  E'{"function_name":"maxNonOverlappingIntervals","params":[{"name":"intervals","type":"int[][]"}],"returns":"int"}'::jsonb,
  E'{"python":"from typing import List\\n\\n\\nclass Solution:\\n    def maxNonOverlappingIntervals(self, intervals: List[List[int]]) -> int:\\n        # ここに解答を書く\\n        pass\\n","rust":"impl Solution {\\n    pub fn max_non_overlapping_intervals(intervals: Vec<Vec<i64>>) -> i64 {\\n        // ここに解答を書く\\n        0\\n    }\\n}\\n","typescript":"function maxNonOverlappingIntervals(intervals: number[][]): number {\\n    // ここに解答を書く\\n    return 0;\\n}\\n","java":"class Solution {\\n    public long maxNonOverlappingIntervals(long[][] intervals) {\\n        // ここに解答を書く\\n        return 0;\\n    }\\n}\\n"}'::jsonb,
  E'{"python":"\\n\\n# --- RaidCoder judge harness (auto-generated) ---\\nimport sys\\n\\n\\ndef _rc_main():\\n    _lines = sys.stdin.read().split(\\"\\\\n\\")\\n    _i = 0\\n    _r = int(_lines[_i]); _i += 1\\n    intervals = []\\n    for _ in range(_r):\\n        _parts = _lines[_i].split(); _i += 1\\n        intervals.append([int(v) for v in _parts[1:1 + int(_parts[0])]])\\n    _res = Solution().maxNonOverlappingIntervals(intervals)\\n    print(_res)\\n\\n\\n_rc_main()\\n","rust":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\nstruct Solution;\\n\\nfn main() {\\n    use std::io::Read;\\n    let mut _s = String::new();\\n    std::io::stdin().read_to_string(&mut _s).unwrap();\\n    let mut _it = _s.lines();\\n    let _r: usize = _it.next().unwrap().trim().parse().unwrap();\\n    let intervals: Vec<Vec<i64>> = (0.._r).map(|_| {\\n        let mut _w = _it.next().unwrap().split_whitespace().map(|v| v.parse::<i64>().unwrap());\\n        let _m = _w.next().unwrap() as usize;\\n        _w.take(_m).collect()\\n    }).collect();\\n    let _res = Solution::max_non_overlapping_intervals(intervals);\\n    println!(\\"{}\\", _res);\\n}\\n","typescript":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\n// 本番ジャッジ(素の tsc)には @types/node が無いため require を自前で宣言する\\ndeclare function require(name: string): any;\\nconst _rcLines: string[] = require(\\"fs\\").readFileSync(\\"/dev/stdin\\", \\"utf8\\").split(\\"\\\\n\\");\\nlet _rcI = 0;\\nconst _r_intervals: number = parseInt(_rcLines[_rcI++], 10);\\nconst intervals: number[][] = [];\\nfor (let _i = 0; _i < _r_intervals; _i++) {\\n    const _w = _rcLines[_rcI++].split(/\\\\s+/).filter(function (s) { return s.length > 0; }).map(Number);\\n    intervals.push(_w.slice(1, 1 + _w[0]));\\n}\\nconst _res = maxNonOverlappingIntervals(intervals);\\nconsole.log(String(_res));\\n","java":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\npublic class Main {\\n    public static void main(String[] _args) throws Exception {\\n        java.io.BufferedReader _br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));\\n        int _r0 = Integer.parseInt(_br.readLine().trim());\\n        long[][] intervals = new long[_r0][];\\n        for (int _i = 0; _i < _r0; _i++) {\\n            java.util.StringTokenizer _st0 = new java.util.StringTokenizer(_br.readLine());\\n            int _m = Integer.parseInt(_st0.nextToken());\\n            intervals[_i] = new long[_m];\\n            for (int _j = 0; _j < _m; _j++) intervals[_i][_j] = Long.parseLong(_st0.nextToken());\\n        }\\n        long _res = new Solution().maxNonOverlappingIntervals(intervals);\\n        System.out.println(_res);\\n    }\\n}\\n"}'::jsonb
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  (E'aaaaaaaa-0000-0000-0000-000000000003', E'sample_1', E'3\n2 1 3\n2 2 5\n2 4 7\n', E'2\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000003', E'sample_2', E'3\n2 1 2\n2 2 3\n2 3 4\n', E'3\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000003', E'hidden_1', E'1\n2 0 1000000000\n', E'1\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000003', E'hidden_2', E'4\n2 1 10\n2 2 3\n2 3 4\n2 4 5\n', E'3\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000003', E'hidden_3', E'5\n2 5 6\n2 1 3\n2 2 8\n2 3 5\n2 7 9\n', E'4\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000003', E'hidden_4', E'4\n2 1 4\n2 2 4\n2 3 4\n2 1 4\n', E'1\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  E'aaaaaaaa-0000-0000-0000-000000000003',
  E'終了時刻の早い区間から貪欲に選びます。\n\n区間を終了時刻の昇順に並べ、直前に選んだ区間の終了時刻 `last_end` を持ちながら\n先頭から順に見て、`start >= last_end` なら選び `last_end` を更新します。\n\n**正当性**: 最適解の中で最初に終わる区間を $x$、貪欲法が選ぶ最初の区間を $g$ とすると、\n$g$ は全区間の中で終了時刻が最小なので $end_g \\le end_x$ です。よって最適解の $x$ を $g$ に\n置き換えても他の区間と重ならず、個数も変わりません。以降も同じ議論を繰り返せるため、\n貪欲法の解は必ず最適解と同じ個数になります。\n\n開始時刻の昇順や区間の長さの昇順で選ぶと反例があります(例: `[[1,10],[2,3],[3,4]]`)。\n\n計算量はソートが支配的で $O(N \\log N)$ です。',
  E'[{"language":"python","code":"from typing import List\\n\\n\\nclass Solution:\\n    def maxNonOverlappingIntervals(self, intervals: List[List[int]]) -> int:\\n        count = 0\\n        last_end = None\\n        for start, end in sorted(intervals, key=lambda v: v[1]):\\n            if last_end is None or start >= last_end:\\n                count += 1\\n                last_end = end\\n        return count"}]'::jsonb
);

-- ============ A: 最長増加部分列の長さ ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage,
   signature, code_templates, judge_harnesses)
values (
  E'aaaaaaaa-0000-0000-0000-000000000002',
  E'11111111-1111-1111-1111-111111111111',
  E'A',
  E'最長増加部分列の長さ',
  E'整数の配列 `nums` が与えられます。`nums` から要素をいくつか取り出して(順序は変えずに)\n作れる **狭義単調増加** な部分列のうち、最長のものの長さを返してください。\n\n部分列は連続していなくてもかまいません。狭義単調増加とは、隣り合う要素が常に\n前 $<$ 後 を満たすことを指します。\n\n## 例\n\n```\n入力: nums = [10,9,2,5,3,7,101,18]\n出力: 4\n説明: [2,3,7,101] が最長で、長さは 4 です。\n```\n\n```\n入力: nums = [7,7,7,7]\n出力: 1\n説明: 同じ値は増加していないため、長さは 1 です。\n```\n\n## 制約\n\n- $1 \\le$ `nums.length` $\\le 2 \\times 10^5$\n- $-10^9 \\le$ `nums[i]` $\\le 10^9$',
  2000, 262144, 5500,
  E'{"function_name":"lengthOfLIS","params":[{"name":"nums","type":"int[]"}],"returns":"int"}'::jsonb,
  E'{"python":"from typing import List\\n\\n\\nclass Solution:\\n    def lengthOfLIS(self, nums: List[int]) -> int:\\n        # ここに解答を書く\\n        pass\\n","rust":"impl Solution {\\n    pub fn length_of_l_i_s(nums: Vec<i64>) -> i64 {\\n        // ここに解答を書く\\n        0\\n    }\\n}\\n","typescript":"function lengthOfLIS(nums: number[]): number {\\n    // ここに解答を書く\\n    return 0;\\n}\\n","java":"class Solution {\\n    public long lengthOfLIS(long[] nums) {\\n        // ここに解答を書く\\n        return 0;\\n    }\\n}\\n"}'::jsonb,
  E'{"python":"\\n\\n# --- RaidCoder judge harness (auto-generated) ---\\nimport sys\\n\\n\\ndef _rc_main():\\n    _lines = sys.stdin.read().split(\\"\\\\n\\")\\n    _i = 0\\n    _i += 1  # 要素数行は読み飛ばす\\n    nums = [int(v) for v in _lines[_i].split()]; _i += 1\\n    _res = Solution().lengthOfLIS(nums)\\n    print(_res)\\n\\n\\n_rc_main()\\n","rust":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\nstruct Solution;\\n\\nfn main() {\\n    use std::io::Read;\\n    let mut _s = String::new();\\n    std::io::stdin().read_to_string(&mut _s).unwrap();\\n    let mut _it = _s.lines();\\n    let _ = _it.next();\\n    let nums: Vec<i64> = _it.next().unwrap().split_whitespace().map(|v| v.parse().unwrap()).collect();\\n    let _res = Solution::length_of_l_i_s(nums);\\n    println!(\\"{}\\", _res);\\n}\\n","typescript":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\n// 本番ジャッジ(素の tsc)には @types/node が無いため require を自前で宣言する\\ndeclare function require(name: string): any;\\nconst _rcLines: string[] = require(\\"fs\\").readFileSync(\\"/dev/stdin\\", \\"utf8\\").split(\\"\\\\n\\");\\nlet _rcI = 0;\\n_rcI++;\\nconst nums: number[] = _rcLines[_rcI++].split(/\\\\s+/).filter(function (s) { return s.length > 0; }).map(Number);\\nconst _res = lengthOfLIS(nums);\\nconsole.log(String(_res));\\n","java":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\npublic class Main {\\n    public static void main(String[] _args) throws Exception {\\n        java.io.BufferedReader _br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));\\n        int _n0 = Integer.parseInt(_br.readLine().trim());\\n        long[] nums = new long[_n0];\\n        java.util.StringTokenizer _st0 = new java.util.StringTokenizer(_br.readLine());\\n        for (int _i = 0; _i < _n0; _i++) nums[_i] = Long.parseLong(_st0.nextToken());\\n        long _res = new Solution().lengthOfLIS(nums);\\n        System.out.println(_res);\\n    }\\n}\\n"}'::jsonb
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  (E'aaaaaaaa-0000-0000-0000-000000000002', E'sample_1', E'8\n10 9 2 5 3 7 101 18\n', E'4\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000002', E'sample_2', E'4\n7 7 7 7\n', E'1\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000002', E'hidden_1', E'5\n1 2 3 4 5\n', E'5\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000002', E'hidden_2', E'5\n5 4 3 2 1\n', E'1\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000002', E'hidden_3', E'12\n0 8 4 12 2 10 6 14 1 9 5 13\n', E'5\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000002', E'hidden_4', E'7\n-5 -1 -3 0 2 -2 3\n', E'5\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  E'aaaaaaaa-0000-0000-0000-000000000002',
  E'$O(N^2)$ の DP(「$i$ 番目で終わる最長増加部分列の長さ」)は $N \\le 2 \\times 10^5$ では\n間に合わないため、二分探索で $O(N \\log N)$ にします。\n\n配列 `tails` を「長さ $k+1$ の増加部分列の末尾としてあり得る最小値」を\n`tails[k]` に持つものとして管理します。`tails` は常に狭義単調増加になります。\n\n各要素 $x$ について `tails` 内で $x$ 以上となる最初の位置を二分探索し、\n\n- その位置が末尾を超えていれば `tails` に $x$ を追加(最長長さが 1 伸びる)\n- そうでなければその位置を $x$ で上書き(同じ長さをより小さい末尾で達成できる)\n\nとします。最後の `tails` の長さが答えです。`tails` 自体は最長増加部分列そのものとは\n限らない点に注意してください(長さだけが正しい)。\n\n広義単調増加(同じ値を許す)を求める場合は、二分探索を `bisect_right` 相当に変えます。\n\n計算量は $O(N \\log N)$ です。',
  E'[{"language":"python","code":"import bisect\\nfrom typing import List\\n\\n\\nclass Solution:\\n    def lengthOfLIS(self, nums: List[int]) -> int:\\n        tails = []\\n        for x in nums:\\n            i = bisect.bisect_left(tails, x)\\n            if i == len(tails):\\n                tails.append(x)\\n            else:\\n                tails[i] = x\\n        return len(tails)"}]'::jsonb
);

-- ============ S: 最大の長方形 ============
insert into public.problems
  (id, week_id, rank, title, statement_md, time_limit_ms, memory_limit_kb, base_damage,
   signature, code_templates, judge_harnesses)
values (
  E'aaaaaaaa-0000-0000-0000-000000000001',
  E'11111111-1111-1111-1111-111111111111',
  E'S',
  E'最大の長方形',
  E'`0` と `1` だけからなる同じ長さの文字列の配列 `grid` が与えられます。\n`grid[i][j]` はマス $(i, j)$ の値を表します。\n\nすべてのマスが `1` であるような軸に平行な長方形のうち、面積(含まれるマスの個数)が\n最大のものを求め、その面積を返してください。`1` のマスが 1 つも無い場合は $0$ を返してください。\n\n## 例\n\n```\n入力: grid = ["10100","10111","11111","10010"]\n出力: 6\n説明: 3 行目を下辺、2〜3 行目・右から 3 列分を使う 2×3 の長方形が最大です。\n```\n\n```\n入力: grid = ["0"]\n出力: 0\n説明: 1 のマスがありません。\n```\n\n## 制約\n\n- $1 \\le$ `grid.length` $\\le 200$\n- $1 \\le$ `grid[i].length` $\\le 200$\n- `grid` の各要素の長さは等しい\n- `grid[i][j]` は `0` または `1`',
  2000, 262144, 8500,
  E'{"function_name":"maxRectangleArea","params":[{"name":"grid","type":"str[]"}],"returns":"int"}'::jsonb,
  E'{"python":"from typing import List\\n\\n\\nclass Solution:\\n    def maxRectangleArea(self, grid: List[str]) -> int:\\n        # ここに解答を書く\\n        pass\\n","rust":"impl Solution {\\n    pub fn max_rectangle_area(grid: Vec<String>) -> i64 {\\n        // ここに解答を書く\\n        0\\n    }\\n}\\n","typescript":"function maxRectangleArea(grid: string[]): number {\\n    // ここに解答を書く\\n    return 0;\\n}\\n","java":"class Solution {\\n    public long maxRectangleArea(String[] grid) {\\n        // ここに解答を書く\\n        return 0;\\n    }\\n}\\n"}'::jsonb,
  E'{"python":"\\n\\n# --- RaidCoder judge harness (auto-generated) ---\\nimport sys\\n\\n\\ndef _rc_main():\\n    _lines = sys.stdin.read().split(\\"\\\\n\\")\\n    _i = 0\\n    _n = int(_lines[_i]); _i += 1\\n    grid = _lines[_i:_i + _n]; _i += _n\\n    _res = Solution().maxRectangleArea(grid)\\n    print(_res)\\n\\n\\n_rc_main()\\n","rust":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\nstruct Solution;\\n\\nfn main() {\\n    use std::io::Read;\\n    let mut _s = String::new();\\n    std::io::stdin().read_to_string(&mut _s).unwrap();\\n    let mut _it = _s.lines();\\n    let _n: usize = _it.next().unwrap().trim().parse().unwrap();\\n    let grid: Vec<String> = (0.._n).map(|_| _it.next().unwrap().to_string()).collect();\\n    let _res = Solution::max_rectangle_area(grid);\\n    println!(\\"{}\\", _res);\\n}\\n","typescript":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\n// 本番ジャッジ(素の tsc)には @types/node が無いため require を自前で宣言する\\ndeclare function require(name: string): any;\\nconst _rcLines: string[] = require(\\"fs\\").readFileSync(\\"/dev/stdin\\", \\"utf8\\").split(\\"\\\\n\\");\\nlet _rcI = 0;\\nconst _n_grid: number = parseInt(_rcLines[_rcI++], 10);\\nconst grid: string[] = _rcLines.slice(_rcI, _rcI + _n_grid); _rcI += _n_grid;\\nconst _res = maxRectangleArea(grid);\\nconsole.log(String(_res));\\n","java":"\\n\\n// --- RaidCoder judge harness (auto-generated) ---\\npublic class Main {\\n    public static void main(String[] _args) throws Exception {\\n        java.io.BufferedReader _br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));\\n        int _n0 = Integer.parseInt(_br.readLine().trim());\\n        String[] grid = new String[_n0];\\n        for (int _i = 0; _i < _n0; _i++) grid[_i] = _br.readLine();\\n        long _res = new Solution().maxRectangleArea(grid);\\n        System.out.println(_res);\\n    }\\n}\\n"}'::jsonb
);

insert into public.test_cases (problem_id, name, input, expected_output, is_sample) values
  (E'aaaaaaaa-0000-0000-0000-000000000001', E'sample_1', E'4\n10100\n10111\n11111\n10010\n', E'6\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000001', E'sample_2', E'1\n0\n', E'0\n', true),
  (E'aaaaaaaa-0000-0000-0000-000000000001', E'hidden_1', E'2\n11\n11\n', E'4\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000001', E'hidden_2', E'4\n0110\n1111\n1111\n0110\n', E'8\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000001', E'hidden_3', E'1\n1\n', E'1\n', false),
  (E'aaaaaaaa-0000-0000-0000-000000000001', E'hidden_4', E'3\n101\n111\n101\n', E'3\n', false);

insert into public.problem_editorials (problem_id, editorial_md, official_solutions) values (
  E'aaaaaaaa-0000-0000-0000-000000000001',
  E'1 行ずつ下に降りながら「各列について、その行を下端としたときに上へ連続する `1` の個数」を\nヒストグラムの高さとして更新し、各行でヒストグラム内の最大長方形を求めます。\n2 つのアルゴリズム(列ごとの DP と、ヒストグラムの最大長方形)の組み合わせです。\n\n**高さの更新**: `grid[i][j] == \'1\'` なら `heights[j] += 1`、`0` なら `heights[j] = 0`。\n\n**ヒストグラム内の最大長方形**: 高さが単調増加になるようにインデックスを積む\nスタック(単調スタック)を使い、より低い高さが来たときに積まれた棒を取り出して\n「その棒の高さ $\\times$ 伸ばせる幅」を計算します。各棒はスタックに 1 回だけ入って\n1 回だけ出るため、1 行あたり $O(W)$ で求まります。番兵として末尾に高さ $0$ を\n足しておくと、最後にスタックへ残る棒も同じ処理で回収できます。\n\n全体の計算量は $O(HW)$ です。マス目の全探索($O(H^2W^2)$)は\n$H, W \\le 200$ では間に合いません。',
  E'[{"language":"python","code":"from typing import List\\n\\n\\nclass Solution:\\n    def maxRectangleArea(self, grid: List[str]) -> int:\\n        width = len(grid[0])\\n        heights = [0] * width\\n        best = 0\\n        for row in grid:\\n            for j in range(width):\\n                heights[j] = heights[j] + 1 if row[j] == \'1\' else 0\\n            best = max(best, self._largest_in_histogram(heights))\\n        return best\\n\\n    def _largest_in_histogram(self, heights: List[int]) -> int:\\n        stack = []  # 高さが単調増加になるように保つインデックスのスタック\\n        best = 0\\n        for i, h in enumerate(heights + [0]):\\n            while stack and heights[stack[-1]] >= h:\\n                top = stack.pop()\\n                left = stack[-1] + 1 if stack else 0\\n                best = max(best, heights[top] * (i - left))\\n            stack.append(i)\\n        return best"}]'::jsonb
);
