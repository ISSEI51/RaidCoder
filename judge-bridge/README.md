# judge-bridge — 提出ジャッジワーカー

RaidCoder の提出を採点する常駐ワーカー(Lightsail 上で Docker 実行)。
`pending` の提出をポーリングでクレームし、コードを実行・採点して結果を DB に反映する。

## 役割と動作フロー

1. `POLL_INTERVAL_MS` ごとに `claim_pending_submissions` RPC(service role)を呼び、
   `pending` の提出を原子的に `running` へ変えてクレームする(同時処理は最大 **2件**)。
   ワーカーのクラッシュ/強制終了で `running` のまま孤児化した提出
   (クレームから5分以上経過)も、同 RPC が自動的に再クレームして回収する
2. 提出ごとに `problems`(time_limit_ms / memory_limit_kb)と `test_cases` 全件
   (service role なので非サンプルも含む)を取得
3. Executor でコードを全ケース実行
   - **Judge0Executor(既定)** … `POST {JUDGE0_URL}/submissions/batch?base64_encoded=true` で
     バッチ提出 → 1秒間隔(上限あり)で完了までポーリング。
     出力比較は Judge0 に任せず、`compareOutput()`(各行の末尾空白除去+末尾の空行除去→厳密比較)で自前判定
   - **LocalUnsafeExecutor(`EXECUTOR=local`)** … 開発専用。下記の注意を参照
4. ケース結果を CONTRACT §2 の規則で集約
   (1件でも CE → CE。それ以外は IE > RE > TLE > WA の最悪値。全 AC のみ AC)
5. `apply_submission_result` RPC で確定。ダメージ計算・ボスHP減算・EXP 付与は DB 関数内で原子的に行われる
6. 処理中に例外が起きた提出は IE で確定させ、ワーカー自体は落ちない。SIGTERM / SIGINT で
   graceful shutdown(処理中の提出を最大約110秒待つ。docker-compose 側は `stop_grace_period: 120s`)

ログは JSON Lines の構造化ログ(提出ID・判定・ダメージ・所要時間)を標準出力へ出す。

## セットアップ

```bash
cd judge-bridge
npm install
cp .env.example .env   # 値を埋める(docs/CONTRACT.md §9 参照)
```

## ローカル実行

```bash
npm run dev    # tsx で src/index.ts を直接実行
```

ビルドとテスト:

```bash
npm run build  # tsc → dist/
npm test       # vitest(compareOutput / aggregate のユニットテスト)
npm start      # ビルド済み dist/index.js を実行
```

## EXECUTOR=local の注意(開発専用)

`EXECUTOR=local` は **サンドボックスなし** でホストのツールチェーンを直接実行する開発専用モード。

- 提出コードがホストのファイル・ネットワークへ自由にアクセスできるため、
  **信頼できるコードのみ**に使うこと。本番は必ず `EXECUTOR=judge0`
- 必要なツールチェーン: `python3` / `npx tsx`(TypeScript)/ `javac`+`java` / `rustc`。
  無い言語の提出は IE + 警告ログになる
- Java のエントリポイントは `public class Main`(AtCoder と同じ)
- メモリ使用量は計測しない(`memory_kb` は null)

## Docker

```bash
docker build -t raidcoder-judge-bridge .
docker run --env-file .env raidcoder-judge-bridge
```

本番は `infra/` の docker-compose から Judge0 と同一ネットワークで起動する
(`JUDGE0_URL=http://judge0:2358`)。
