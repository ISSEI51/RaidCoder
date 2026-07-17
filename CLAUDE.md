# RaidCoder

AtCoder のレイド版(非同期協力型・競プロゲーム)。仕様の正は `docs/CONTRACT.md`、デザイン方針は `docs/design_policy.md`。

## UI Design Rules

- UIアイコンとして絵文字を使用しない
- アイコンは lucide-react に統一する
- ダークテーマを基本とする
- SaaS管理画面ではなく、競技・eスポーツの雰囲気にする
- 色は背景色、サーフェス色、アクセント色、危険色の4系統に制限する
- グラデーションと発光表現を乱用しない
- すべてをカードで囲まない
- 主要操作は1画面につき1つに絞る
- 角丸は基本8px。ピル型ボタンを乱用しない
- 問題文とコードエディタの可読性を装飾より優先する
- 見出し、本文、補助テキストの階層を明確にする
- 実装後は必ずブラウザでスクリーンショットを確認する

## UI 実装の約束

- 4系統の色の定義は `web/src/app/globals.css` の CSS 変数(shadcn/ui トークン)が正。任意の色をコンポーネントに直書きしない
  - 例外: レート色(AtCoder 風 8 段階)と提出ステータス色はドメインデータの可視化として `web/src/lib/rating.ts` / `StatusBadge` に集約する(UI チュームには使わない)
- 汎用 UI 部品は shadcn/ui(`web/src/components/ui/`)を使う。ボタン・カード・タブ等を独自実装しない
- キャラクター(ボス等)を絵文字で表現するのは禁止。`BossAvatar` コンポーネント経由で表示し、画像は `web/public/characters/` に置く(生成は Replicate MCP、`docs/design_policy.md` の手順に従う)
