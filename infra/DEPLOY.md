# RaidCoder デプロイ手順(本番)

構成は 3 箇所。上から順にコピペで進めれば約1時間で本番が立ち上がる。

| 場所 | 役割 |
|---|---|
| **Supabase** (Free) | PostgreSQL / GitHub OAuth / Realtime |
| **Vercel** (Hobby) | `web/` — Next.js アプリ |
| **AWS Lightsail** (4GB) | Judge0 + `judge-bridge/` + `generator/`(週次 cron) |

## 0. 前提

- このリポジトリが GitHub に push 済み
- 手元に Node.js 24 と npx がある
- AWS アカウント / Anthropic API キー([console.anthropic.com](https://console.anthropic.com/) で発行)

---

## 1. Supabase

### 1-1. プロジェクト作成

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Name: `raidcoder` / Region: **Northeast Asia (Tokyo)** / Database Password は自動生成のまま保存
3. 作成完了後、URL `https://<project-ref>.supabase.co` の `<project-ref>` を控える

### 1-2. GitHub OAuth アプリ作成

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. 以下を入力(Homepage は後で Vercel の URL に更新してよい):

   | 項目 | 値 |
   |---|---|
   | Application name | `RaidCoder` |
   | Homepage URL | `https://<あなたのアプリ>.vercel.app`(未定なら仮でOK) |
   | Authorization callback URL | `https://<project-ref>.supabase.co/auth/v1/callback` |

3. 作成後、**Client ID** を控え、**Generate a new client secret** で **Client Secret** を発行して控える

### 1-3. Supabase Auth に GitHub を設定

1. Supabase Dashboard → **Authentication → Sign In / Providers → GitHub**
2. **Enable** をオンにし、1-2 の Client ID / Client Secret を貼り付けて **Save**

### 1-4. migration 適用

リポジトリのルートで:

```bash
npx supabase login                               # ブラウザで認証
npx supabase link --project-ref <project-ref>    # 1-1 で控えた ref
npx supabase db push                             # supabase/migrations/ を適用
```

`db push` の確認プロンプトに `Y`。`0001_init.sql` が適用されればテーブル・RPC・RLS がすべて入る。

> 本番に seed(チュートリアル週)は入れない。最初の週は generator が作る(§3-7)。

### 1-5. キーの取得場所(以降の手順で使う)

Dashboard → **Project Settings → API**:

| キー | 使う場所 |
|---|---|
| Project URL (`https://<project-ref>.supabase.co`) | Vercel の `NEXT_PUBLIC_SUPABASE_URL` / Lightsail の `SUPABASE_URL` |
| `anon` `public` キー | Vercel の `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` キー | Lightsail の `SUPABASE_SERVICE_ROLE_KEY`(**絶対に公開しない**) |

---

## 2. Vercel

### 2-1. プロジェクト作成

1. [vercel.com/new](https://vercel.com/new) → GitHub リポジトリ `RaidCoder` を **Import**
2. **Root Directory** を `web` に変更(Edit → `web` を選択)
3. Framework Preset: **Next.js**(自動検出される)

### 2-2. 環境変数

同じ画面の **Environment Variables** に以下を設定して **Deploy**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon キー>
```

デプロイ完了後の URL(例: `https://raidcoder.vercel.app`)を控える。

### 2-3. Supabase 側に Redirect URL を追加

1. Supabase Dashboard → **Authentication → URL Configuration**
2. **Site URL**: `https://raidcoder.vercel.app`(自分の URL に読み替え)
3. **Redirect URLs** に追加: `https://raidcoder.vercel.app/**`
4. GitHub OAuth App(1-2)の Homepage URL も本番 URL に更新しておく

この時点でブラウザから GitHub ログインできるはず(問題はまだ無い)。

---

## 3. Lightsail(Judge0 + judge-bridge + generator)

### 3-1. インスタンス作成

1. [Lightsail コンソール](https://lightsail.aws.amazon.com/) → **Create instance**
2. リージョン: **Tokyo (ap-northeast-1)**
3. Platform: **Linux/Unix** / Blueprint: **OS Only → Ubuntu 22.04 LTS**
4. プラン: **$24/月(4GB RAM / 2 vCPU / 80GB SSD)** — Judge0 + workers を動かすため 4GB 必須
5. 名前: `raidcoder` → **Create instance**
6. Networking タブ: ファイアウォールは **SSH (22) のみ**でよい(Judge0 は外部公開しないため 2358 等は開けない)

以降はブラウザの SSH コンソール、または `ssh ubuntu@<固定IP>` で作業。

### 3-2. Docker インストール

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
# グループ反映のため一度ログアウト→再ログイン
exit
```

再ログイン後、`docker --version` と `docker compose version` が表示されれば OK。

### 3-3. ⚠️ cgroup v1 へ切り替え(Judge0 v1.13 必須)

**Judge0 v1.13 のサンドボックス(isolate)は cgroup v1 でしか動かない。** Ubuntu 22.04 は標準が cgroup v2 のため、カーネル起動オプションで v1 に戻して再起動する:

```bash
sudo sed -i 's/GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 systemd.unified_cgroup_hierarchy=0"/' /etc/default/grub
sudo update-grub
sudo reboot
```

再起動後(1〜2分)に再ログインして確認:

```bash
stat -fc %T /sys/fs/cgroup/
# => "tmpfs" なら cgroup v1(成功)。"cgroup2fs" のままなら失敗(GRUB 設定を見直す)
```

### 3-4. リポジトリ配置と .env

```bash
cd ~
git clone https://github.com/<あなた>/RaidCoder.git
cd RaidCoder/infra
cp .env.example .env
```

トークンを生成して `.env` を編集:

```bash
openssl rand -hex 32    # => JUDGE0_AUTH_TOKEN に貼る
nano .env
```

`.env` に設定する値:

```
JUDGE0_AUTH_TOKEN=<↑で生成した値>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role キー>
AI_PROVIDER=anthropic-api
ANTHROPIC_API_KEY=<Anthropic API キー>
AI_MODEL=claude-sonnet-5
```

Judge0 内部 DB のパスワードもデフォルトから変更する(内部ネットワーク専用だが念のため):

```bash
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 16)/" judge0.conf
sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=$(openssl rand -hex 16)/" judge0.conf
```

### 3-5. 起動

```bash
docker compose up -d --build
docker compose ps
```

`server` / `workers` / `judge0-db` / `judge0-redis` / `judge-bridge` の 5 サービスが `Up` になれば OK(generator は `profiles: ["tools"]` のため常駐しない)。

### 3-6. 動作確認

Judge0 のヘルスチェック(ホストにポートを公開していないので、コンテナ内から curl する):

```bash
source .env
docker compose exec server curl -s -H "X-Auth-Token: $JUDGE0_AUTH_TOKEN" http://localhost:2358/about
# => {"version":"1.13.1",...} が返れば OK
```

認証が効いていることの確認(トークンなしだと拒否される):

```bash
docker compose exec server curl -s http://localhost:2358/about
# => {"error":"Authentication failed"} なら OK
```

judge-bridge がポーリングを開始しているか:

```bash
docker compose logs -f judge-bridge   # Ctrl+C で抜ける
```

### 3-7. 最初の週を生成

`rotate` は「現行週の終了 → 次週の生成(AI)→ 次週の開始」を一括で行う。初回はアクティブ週が無いので、生成と開始だけが走る:

```bash
docker compose run --rm generator rotate
```

数分かかる(AI 生成 + 公式解の Judge0 検証)。完了後、Vercel の URL を開いてボスと問題 6 問が表示されれば本番稼働開始。

> generator イメージは `node:24-alpine` 上で `dist/` を実行するエントリポイントのため、`run --rm generator <コマンド>` の引数がそのまま CLI サブコマンド(`rotate` / `generate` / `finalize --week <n>` / `activate --week <n>`)になる。

---

## 4. cron(毎週月曜 00:00 JST に週次ローテーション)

Lightsail の Ubuntu はタイムゾーンが **UTC** のため、JST 月曜 00:00 = **UTC 日曜 15:00**。root の crontab に登録する:

```bash
sudo crontab -e
```

以下の1行を追加(パスは自分の環境に読み替え):

```cron
# RaidCoder 週次ローテーション(JST 月曜 00:00 = UTC 日曜 15:00)
0 15 * * 0 cd /home/ubuntu/RaidCoder/infra && /usr/bin/docker compose run --rm generator rotate >> /var/log/raidcoder-rotate.log 2>&1
```

> サーバーの TZ を JST にしたい場合は `sudo timedatectl set-timezone Asia/Tokyo` した上で `0 0 * * 1`(月曜 00:00)にしてもよい。**どちらか一方だけ**にすること。

### ログ確認

```bash
sudo tail -n 100 /var/log/raidcoder-rotate.log   # rotate の実行ログ
docker compose logs --since 24h judge-bridge      # ジャッジのログ
docker compose logs --since 24h server workers    # Judge0 のログ
```

rotate が失敗した週は手動リカバリできる:

```bash
cd ~/RaidCoder/infra
docker compose run --rm generator rotate                  # 再実行(冪等)
# それでもだめなら個別に:
docker compose run --rm generator finalize --week <n>
docker compose run --rm generator generate
docker compose run --rm generator activate --week <n+1>
```

---

## 5. 月額コスト(合計 ¥5,000 以内)

1 USD = 155 円換算の概算:

| 項目 | プラン | 月額 |
|---|---|---|
| AWS Lightsail | 4GB / 2vCPU / 80GB SSD | $24 ≒ **¥3,720** |
| Vercel | Hobby | **¥0** |
| Supabase | Free | **¥0** |
| Anthropic API | 週1回の問題生成(claude-sonnet-5、月4〜5回) | **¥100〜500** 程度 |
| **合計** | | **約 ¥3,800〜4,200** |

> Supabase Free はプロジェクトが1週間アクセスなしで一時停止されるが、毎週の提出・cron があれば実質問題にならない。

---

## 6. トラブルシューティング

| 症状 | 確認すること |
|---|---|
| 提出が `pending` のまま進まない | `docker compose logs judge-bridge`。`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` の設定ミスが大半 |
| Judge0 の submission が `Internal Error` ばかり | cgroup v1 になっているか(§3-3 の `stat` で確認)。なっていなければ GRUB 設定をやり直して再起動 |
| GitHub ログインが `redirect_uri mismatch` | GitHub OAuth App の callback が `https://<project-ref>.supabase.co/auth/v1/callback` になっているか |
| ログイン後に Vercel に戻らない | Supabase の URL Configuration(§2-3)に本番 URL が入っているか |
| rotate が AI エラーで失敗 | `ANTHROPIC_API_KEY` の残高・レート制限。`docker compose run --rm generator generate` で再試行 |
