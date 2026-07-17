# キャラクター アートディレクション(確定版)

`docs/design_policy.md`「キャラクター」章の成果物。**2026-07-17 ユーザー承認済み・全8体配置完了。**

## 確定した方向性

近未来の**競技プログラミング・アリーナ**に登場する週次レイドの**ボスモンスター**8体。

- **画風: 16-bit SNES ボス風の高精細ピクセルアート**(チャンキーなピクセル、限定パレット、ダーク輪郭、ディザリング陰影)
- **完全な人外**: 人間の顔・胴体・バストアップ構図は禁止。全身のクリーチャーとして描く
- **モチーフ: 開発ツールのマスコット動物**をオリジナルモンスター化(ロゴ・マスコットの複製は禁止、あくまで「その動物がモチーフ」)
- **派手で強そうに**: ボス戦の迫力を優先し、アクセント色のエネルギーエフェクト(雷・炎・オーラ等)を各体にまとわせる
- **向きは個体ごとに変える**(全員同方向は禁止): 左向き・右向き・正面・斜めを混在させる
- 体色は低彩度ダーク+キャラ固有**アクセント1色**(`web/src/lib/characters.ts` と一致)
- 背景は無地ダークグレーで生成 → 背景除去モデルで透過 → 512×512 に縮小
- 文字・ロゴ・ステッカー風外枠は禁止

### 経緯(棄却案)

1. 人型競技者(カードイラスト調) → 「人間すぎる・8体が似すぎる」で棄却
2. 人型+異形ミックス → 同上
3. カードイラスト調モンスター → ピクセルアートへ方向転換
4. ピクセルアート落ち着き版 → 「もっと派手で強そうに」で強化
5. **開発ツールモチーフ版で確定**

## キャラクター設定(8体・確定)

| キャラ | 役割 | ツールモチーフ | アクセント | デザイン |
|---|---|---|---|---|
| Pathfinder | グラフ探索・迷路 | Git | `#38bdf8` 空色 | 大ダコ。触手がコミットグラフ状に分岐し、発光ノードが点在。羅針盤レンズの単眼 |
| Architect | 動的計画法・設計 | Docker | `#a78bfa` 紫 | 装甲クジラ。背中に発光コンテナの要塞都市を積載、潮吹きがエネルギー化 |
| Hacker | ビット演算・XOR | Python | `#34d399` 緑 | 双頭大蛇。鱗が0/1バイナリ紋様、緑の炎をまとう |
| Sentinel | セキュリティ・検証 | Rust | `#f59e0b` 琥珀 | 重装甲ガニ。リベット付き錆色装甲、盾のような巨大な鋏でガード構え |
| Speedrunner | 貪欲法・高速実装 | (高速な狐) | `#f472b6` 桃 | 疾走する狐獣。刃状の複数尾が桃色の残像を引き、鼻先でソニックブーム |
| Oracle | 数学・確率 | PostgreSQL | `#818cf8` 藍 | 賢者ゾウ。装甲皮膚にDBテーブルの刻印、額の第三の目、牙の周囲を球が周回 |
| Debugger | バグ発見・テスト | 世界初のバグ(蛾) | `#fb7185` 珊瑚 | 巨大蛾。回路基板模様の翅、珊瑚色の炎。Grace Hopper の実話モチーフ |
| Commander | チーム戦・レーティング | Linux | `#facc15` 金 | 皇帝ペンギン武将。金装甲・王冠クレスト・羽根のマント、片翼で号令 |

## 生成パイプライン(再現手順)

モデルはいずれも Replicate(`REPLICATE_API_TOKEN` で HTTP API を直接叩く。API 呼び出しには User-Agent ヘッダー必須)。

1. **生成**: `google/nano-banana` にキャラごとのプロンプト(1:1、PNG、無地ダークグレー背景指定)。レート制限(429)対策で逐次実行+リトライ
2. **背景透過**: `851-labs/background-remover`(入力はローカルファイルを Files API でアップロードした URL)
3. **縮小**: 1024×1024 → 512×512(PIL LANCZOS)
4. **配置**: `web/public/characters/<slug>.png`(`BossAvatar` が自動で読む)
5. ブラウザでスクリーンショット確認(CLAUDE.md のルール)

プロンプトの全文は生成スクリプト(セッションの scratchpad `gen_characters.py`)を参照。共通断片:

```
High-quality detailed pixel art sprite, 16-bit SNES boss style, chunky visible
pixels, limited color palette, clean pixel clusters with dark outline, subtle
dithering for shading.
<キャラ固有の記述: 動物モチーフ+向き+エフェクト+アクセント色>
The creature is completely NON-HUMAN — no human face, no human torso.
Full creature visible in a powerful dynamic boss-battle pose, radiating energy
effects in its accent color. Plain solid dark gray background. No text, no
letters, no logos, original design not resembling any existing game or anime
character. Square 1:1 composition.
```
