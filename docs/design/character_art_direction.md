# キャラクター アートディレクション案

`docs/design_policy.md`「キャラクター」章のステップ1。基準キャラクター承認後、この文書を正として残り7体を生成する。

## 世界観

近未来の**競技プログラミング・アリーナ**。RaidCoder のキャラクターは、週次レイドに挑む競技者(オペレーター)たち。ファンタジーの「剣士・魔法使い」ではなく、アルゴリズム分野をモチーフにした役割を持つ。

## 画風(全キャラ統一)

| 項目 | 指定 |
|---|---|
| スタイル | ゲームカード風**セミフラット**イラスト。アニメに寄りすぎない |
| 輪郭線 | 太さ均一のクリーンな線(2〜3px 相当)。全キャラ同一の線幅 |
| 陰影 | セル塗り+**1段階**の影。グラデーション多用しない |
| 光源 | **左上 45°** の単一ソフトライト。リムライトはアクセントカラーでごく薄く(発光・ネオン過剰は禁止) |
| 構図 | **胸上ポートレート**、やや斜め前向き(全キャラ同角度)。頭身バランス統一 |
| 背景 | **透過 PNG**(UI 側で円形サーフェスに載せる) |
| サイズ | 1024×1024 で生成 → 512×512 に縮小して書き出し |
| 禁止 | 絵文字的表現/安っぽいネオン・過剰発光/既存ゲーム・アニメキャラへの類似 |

## 配色

- 衣装ベース: 低彩度のダークトーン(UI の背景・サーフェス色と馴染む)
- キャラ固有**アクセント1色**を差し色に(`web/src/lib/characters.ts` の値と一致させる)

## キャラクター設定(8体)

| キャラ | モチーフ | アクセント | 衣装・小物への反映例 |
|---|---|---|---|
| Pathfinder | グラフ探索・迷路 | `#38bdf8` 空色 | ノードとエッジの意匠、ルートを示すピン、探索者のジャケット |
| Architect | 動的計画法・設計 | `#a78bfa` 紫 | 設計図・格子(DPテーブル)模様、製図用具風の小物 |
| Hacker | ビット演算・XOR | `#34d399` 緑 | フード、袖口に 0/1 やXORグリフの刺繍 |
| Sentinel | セキュリティ・検証 | `#f59e0b` 琥珀 | 盾のエンブレム、チェックマークの記章、堅牢な装備 |
| Speedrunner | 貪欲法・高速実装 | `#f472b6` 桃 | ストップウォッチ、流線的なスポーツウェア |
| Oracle | 数学・確率 | `#818cf8` 藍 | 数式の意匠、確率球(ダイス的だが未来的に)、静かな佇まい |
| Debugger | バグ発見・テスト | `#fb7185` 珊瑚 | ルーペ、ピンセット、観察者の鋭い目つき |
| Commander | チーム戦・レーティング | `#facc15` 金 | ヘッドセット、司令官の肩章、ランクバッジ |

## 生成手順(Replicate MCP)

1. **基準キャラ**: Pathfinder を1体生成(最も中庸なデザインで基準に適するため)
2. ユーザー承認を得る(承認まで他キャラは生成しない)
3. **キャラクターシート**: 基準キャラの線幅・陰影・頭身・角度を言語化した共通プロンプト断片を確定
4. 残り7体を基準キャラ画像を**参照画像**にして生成(統一感を最優先)
5. 背景透過処理(モデルが透過非対応の場合は背景除去モデルを併用)→ 512×512 へ縮小 → `web/public/characters/<slug>.png` に配置

## プロンプト草案(基準キャラ: Pathfinder)

```
Semi-flat game card style character portrait, chest-up, front-facing slightly angled,
near-future competitive programming athlete "Pathfinder",
navigator theme with graph nodes and edges motif on jacket, route pin accessory,
dark low-saturation outfit with sky-blue (#38bdf8) accent color,
clean uniform outline (2-3px), cel shading with single-step shadow,
single soft key light from upper-left 45 degrees, subtle rim light,
plain solid background for later removal,
no neon glow, no text, not resembling any existing game or anime character
```
