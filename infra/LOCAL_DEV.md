# RaidCoder ローカル開発手順

macOS / Linux を想定。DB は Supabase CLI(Docker)、ジャッジは `EXECUTOR=local`、AI 生成は `claude-cli` を使い、**クラウド契約なしで一通り動かせる**。

## 0. 前提ツール

| ツール | 用途 | 確認コマンド |
|---|---|---|
| Node.js 24 | web / judge-bridge / generator | `node --version` |
| Docker Desktop(または Docker Engine) | ローカル Supabase | `docker --version` |
| Supabase CLI | `npx supabase ...` で使う(インストール不要) | `npx supabase --version` |
| python3 | ローカルジャッジの実行系(必須) | `python3 --version` |
| claude CLI(任意) | generator の AI 生成に使う | `claude --version` |

> Rust / Java / TypeScript の提出もローカルで試したい場合は `rustc` / `java` / `npx tsc` が必要。無い言語は Python だけでも開発には十分。

## 1. Supabase をローカルで起動

リポジトリのルートで:

```bash
npx supabase start
```

初回は Docker イメージ取得で数分かかる。起動時に `supabase/migrations/`(スキーマ)と `supabase/seed.sql`(チュートリアル週=ボス+問題3問)が自動適用される。

起動後に表示される情報は後で `npx supabase status` でいつでも再表示できる:

```
API URL:      http://127.0.0.1:54321   ← SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
Studio URL:   http://127.0.0.1:54323   ← ブラウザで DB を確認できる管理画面
anon key:     eyJ...                   ← NEXT_PUBLIC_SUPABASE_ANON_KEY
service_role key: eyJ...               ← SUPABASE_SERVICE_ROLE_KEY(judge-bridge / generator 用)
```

その他の操作:

```bash
npx supabase db reset   # migration + seed からDBを作り直す(データ全消し)
npx supabase stop       # 停止
```

## 2. GitHub OAuth をローカルで使う

ログインには GitHub OAuth App が必要(本番用とは**別に**ローカル専用を作る)。

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**

   | 項目 | 値 |
   |---|---|
   | Application name | `RaidCoder (local)` |
   | Homepage URL | `http://localhost:3000` |
   | Authorization callback URL | `http://localhost:54321/auth/v1/callback` |

2. Client ID / Client Secret を、リポジトリ**直下**の `.env` に書く(`supabase/config.toml` の `[auth.external.github]` が `env(...)` で参照する。`.env` は gitignore 済み):

   ```bash
   # リポジトリ直下の .env
   SUPABASE_AUTH_GITHUB_CLIENT_ID=<Client ID>
   SUPABASE_AUTH_GITHUB_SECRET=<Client Secret>
   ```

   シェルで `export` してもよい。

3. 反映のため再起動:

   ```bash
   npx supabase stop && npx supabase start
   ```

> 未設定のまま `npx supabase start` しても WARN が出るだけで起動はする(GitHub ログインだけ失敗する)。

## 3. web(Next.js)

```bash
cd web
cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<npx supabase status で表示される anon key>
EOF
npm install
npm run dev
```

http://localhost:3000 を開いて GitHub ログイン → チュートリアル週のボスが表示されれば OK。

## 4. ジャッジ(judge-bridge を EXECUTOR=local で)

**macOS では Judge0 は動かない**(cgroup v1 の privileged Linux が必要)。代わりに judge-bridge の開発専用モード `EXECUTOR=local` を使う。これは**サンドボックスなしでホスト上のランタイム(python3 等)を直接実行する**ため、自分の書いたコード以外は流さないこと。

```bash
cd judge-bridge
cat > .env <<'EOF'
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<npx supabase status で表示される service_role key>
EXECUTOR=local
POLL_INTERVAL_MS=2000
EOF
npm install
npm run dev
```

起動したら web から適当な問題に Python で提出 → 数秒で AC になり、ボスの HP バーが減れば成功。

> `EXECUTOR=local` では `JUDGE0_URL` / `JUDGE0_AUTH_TOKEN` は不要。使える言語はホストにランタイムがあるものだけ(python3 は必須。rust / typescript / java は任意)。

## 5. generator(AI 問題生成)を試す

普段の開発は seed のチュートリアル週だけで足りるが、生成フローを試したいとき用。

前提: `claude` CLI をインストールし、`claude setup-token` で認証済みであること(`AI_PROVIDER=claude-cli` は claude CLI を子プロセスで呼ぶため、API キー不要)。

```bash
cd generator
cat > .env <<'EOF'
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<npx supabase status で表示される service_role key>
AI_PROVIDER=claude-cli
AI_MODEL=claude-sonnet-5
EOF
npm install
npm run build
node dist/index.js generate --skip-validation
```

- **`--skip-validation`**: 公式解を Judge0 で全テストケース実行する検証工程をスキップする。ローカルには Judge0 が無いため基本これを付ける(本番の cron では付けない。検証されていない問題が配信されるのを防ぐため)。
- `generate` は次週(week_number = 最大+1)を `upcoming` で保存するだけ。実際に切り替えて遊ぶには:

  ```bash
  node dist/index.js rotate --skip-validation   # 現行週の終了 → 生成(済ならスキップ)→ 次週開始
  ```

## 6. よくあるハマりどころ

| 症状 | 対処 |
|---|---|
| `npx supabase start` が port 54321 で失敗 | 前回のコンテナが残っている。`npx supabase stop` → 再度 start |
| GitHub ログインで `redirect_uri mismatch` | OAuth App の callback が `http://localhost:54321/auth/v1/callback` か確認(3000 ではない) |
| 提出が `pending` のまま | judge-bridge が起動しているか。`.env` の service_role key が anon key になっていないか |
| 提出が全部 `IE` になる | ホストに `python3` があるか。提出言語のランタイムがローカルに無いと実行できない |
| seed を入れ直したい | `npx supabase db reset`(ユーザーも消えるので再ログイン) |
