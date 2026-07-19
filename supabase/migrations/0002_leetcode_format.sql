-- LeetCode(関数実装)形式への移行
--
-- - signature:       関数シグネチャ {function_name, params: [{name, type}], returns}
-- - code_templates:  言語 → エディタ初期表示の関数スタブ
-- - judge_harnesses: 言語 → ジャッジ用ハーネス(提出コードの末尾に連結して実行する)
--
-- いずれも nullable。null の既存問題(AtCoder 形式の旧週)は従来どおり
-- 提出コード単体を stdin/stdout でジャッジする(judge-bridge 側でフォールバック)。
alter table public.problems
  add column if not exists signature jsonb,
  add column if not exists code_templates jsonb,
  add column if not exists judge_harnesses jsonb;
