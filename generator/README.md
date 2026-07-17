# generator — AI問題生成・週ローテーション CLI

RaidCoder の週次コンテンツを生成する CLI。毎週月曜 00:00 JST に Lightsail の cron から `rotate` を実行し、

1. 現行 active 週を `finalize_week()` で終了(レート更新・撃破ボーナス)
2. AI で次週のボス+問題6問(S〜E)を生成し、公式解を Judge0 で全ケース検証
3. 次週を `activate_week()` で開始

を一括で行う。取り決めの詳細は [docs/CONTRACT.md](../docs/CONTRACT.md)、スキーマ・RPC は [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) を参照。

## コマンド (CONTRACT §10)

```
node dist/index.js generate [--skip-validation]
node dist/index.js rotate   [--skip-validation]
node dist/index.js finalize --week <n>
node dist/index.js activate --week <n>
```

| コマンド | 内容 |
|---|---|
| `generate` | 次週(week_number = 既存最大+1)のボス+問題6問を生成し `status='upcoming'` で保存。公式解を Judge0 で全ケース検証し、失敗した問題は最大3回作り直す |
| `rotate` | `finalize_week(現行active)` → 次週が未生成なら `generate` → `activate_week(次週)`。**冪等**(途中失敗後に再実行しても壊れない)。cron からはこれだけを呼ぶ |
| `finalize --week <n>` | 指定週を手動で finalize(リカバリ用) |
| `activate --week <n>` | 指定週を手動で activate(リカバリ用) |

`--skip-validation` は Judge0 が使えない環境(ローカル等)向け。Judge0 での検証を飛ばして保存するが、**隠しテストケースは生成されずサンプルのみ**になるので本番では使わないこと。

## セットアップ

```sh
cd generator
npm install
cp .env.example .env   # 値を埋める
npm run build
npm test
```

### 環境変数 (CONTRACT §9)

| 変数 | 説明 |
|---|---|
| `SUPABASE_URL` | Supabase プロジェクト URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service role キー(RLS をバイパスして保存・RPC 実行) |
| `JUDGE0_URL` | Judge0 CE の URL(例: `http://judge0:2358`) |
| `JUDGE0_AUTH_TOKEN` | Judge0 の `X-Auth-Token` |
| `AI_PROVIDER` | `claude-cli`(ローカル)または `anthropic-api`(本番) |
| `ANTHROPIC_API_KEY` | `anthropic-api` のときのみ必須 |
| `AI_MODEL` | 使用モデル(既定: `claude-sonnet-5`。`claude-opus-4-8` 等に変更可) |

### AI プロバイダ

- **`claude-cli`(ローカル開発用)** — `claude -p --model $AI_MODEL --output-format text` を子プロセスで実行し、プロンプトを stdin で渡す。`claude setup-token` / OAuth の認証をそのまま使うので API キー不要。
- **`anthropic-api`(本番用)** — `@anthropic-ai/sdk` の Messages API(ストリーミング)。`ANTHROPIC_API_KEY` が必要。

## ローカルでの実行例

```sh
# Judge0 なしで動作確認(サンプルのみ保存される)
node dist/index.js generate --skip-validation

# Judge0 込みのフル生成(infra/ の docker-compose で Judge0 を起動しておく)
node dist/index.js generate
```

## cron 設定例(Lightsail)

毎週月曜 00:00 JST に `rotate` を実行する。

サーバの TZ が **Asia/Tokyo** の場合:

```cron
0 0 * * 1 cd /opt/raidcoder/infra && docker compose run --rm generator rotate >> /var/log/raidcoder-rotate.log 2>&1
```

サーバの TZ が **UTC** の場合(月曜 00:00 JST = 日曜 15:00 UTC):

```cron
0 15 * * 0 cd /opt/raidcoder/infra && docker compose run --rm generator rotate >> /var/log/raidcoder-rotate.log 2>&1
```

`rotate` は冪等なので、失敗時に再実行しても安全(生成途中で失敗した週は削除してから作り直す)。cron の失敗に気づけるよう、ログ監視か再試行 cron(例: 毎週月曜 00:30 にもう一度 `rotate`)を推奨。

```cron
30 0 * * 1 cd /opt/raidcoder/infra && docker compose run --rm generator rotate >> /var/log/raidcoder-rotate.log 2>&1
```

(2回目の `rotate` は、すでにローテーション済みなら「まだ終了時刻前のためスキップ」とだけ出て何もしない)

## 手動リカバリ手順

`rotate` が途中で失敗した場合、基本は **`rotate` の再実行** で復旧する。個別に操作したい場合:

1. **finalize だけ済んで生成に失敗した**
   → `rotate` を再実行(生成からやり直す)。不完全な upcoming 週が残っていても自動で削除・再生成される。
2. **生成まで済んで activate に失敗した**
   → `rotate` を再実行するか、`node dist/index.js activate --week <次週番号>` を実行。
   気づかないまま週境界を過ぎてしまった場合も `rotate` の再実行で復旧できる
   (期限切れの upcoming 週は activate せずに削除し、現行週として再生成する)。
3. **finalize を手動でやり直したい**
   → `node dist/index.js finalize --week <週番号>`(active な週にのみ効く。二重実行は DB 側で無視される)。
4. **AI 生成が繰り返し失敗する**
   → ログの検証エラー(サンプル不一致・TLE 等)を確認し、`AI_MODEL` をより強いモデルにして `generate` を再実行。

## 生成パイプライン

1. **コール1(週テーマ)** — ボス名・フレーバー(日本語・RPG風)+ 6問の概要(rank / title / 分野 / 方向性)。分野が週内で重複しないよう指示。
2. **コール2×6(問題ごと)** — `statement_md`(KaTeX可・入出力形式と制約を含む)/ `time_limit_ms` / `samples`(2件以上)/ `case_generator_py`(stdin の seed で小・中・最大ケースを決定的に出し分け)/ `official_solution_py` / `editorial_md` を JSON で受け取り zod で検証。JSON は ```json フェンス抽出等にフォールバックするロバストなパーサで読む。
3. **Judge0 検証** — サンプルは公式解の出力一致を確認(末尾空白・末尾改行トリム比較)。隠しケースは seed 1〜10 で入力を生成し、公式解で期待出力を実体化。実行失敗・TLE・サンプル不一致は**その問題だけ**最大3回再生成。
4. **DB 一括保存** — `raid_weeks`(`boss_max_hp = 20000 × count_active_players()`、週境界は luxon で Asia/Tokyo 計算)、`problems`(`base_damage` は CONTRACT §3 の表)、`test_cases`(サンプル + 隠し10件)、`problem_editorials`(`official_solutions` は `[{"language":"python","code":...}]`)。途中で失敗したら週ごと削除して再実行に備える。

## 開発

```sh
npm run build   # tsc
npm test        # vitest (JSON抽出 / JST週境界 / zodスキーマ / 出力正規化)
```
