# CONTRACT — モジュール間の取り決め(全モジュール厳守)

このファイルと `supabase/migrations/0001_init.sql` が唯一の真実。定数・名前をここから変える場合は全モジュール+このファイルを同時に更新すること。

## 1. 対応言語と Judge0 言語ID

| `submissions.language` | 表示名 | Judge0 CE language_id |
|---|---|---|
| `python` | Python 3.8 | 71 |
| `rust` | Rust 1.40 | 73 |
| `typescript` | TypeScript 3.7 | 74 |
| `java` | Java (OpenJDK 13) | 62 |

- 提出は stdin から入力を読み stdout へ出力する形式(AtCoder と同じ)
- 判定: stdout を末尾空白・末尾改行をトリムして期待出力と厳密比較
- Judge0 へは base64 エンコード(`base64_encoded=true`)で送ること(マルチバイト対策)
- `cpu_time_limit` = `problems.time_limit_ms / 1000`(秒)、`memory_limit` = `problems.memory_limit_kb`

## 2. 提出ステータス遷移

`pending` → (`claim_pending_submissions` で) `running` → 終端: `AC` / `WA` / `TLE` / `RE` / `CE` / `IE`

`running` のままクレーム(`submissions.claimed_at`)から **5分以上**経過した提出は、judge-bridge のクラッシュ等で孤児化したものとみなし、`claim_pending_submissions` が自動的に再クレームして回収する(終端に到達しない提出を作らない)。

集約ルール(複数テストケース → 1つのステータス): 1件でも `CE` → `CE`。それ以外は優先度 `IE > RE > TLE > WA` で最悪のものを採用。全ケース AC のみ `AC`。
`passed_count` = AC だったケース数、`exec_time_ms` = 全ケースの最大値、`memory_kb` = 全ケースの最大値。

## 3. ダメージ計算(実装は `apply_submission_result()` 内のみ)

- 基礎ダメージ `BASE_DAMAGE`: **E=500, D=1000, C=2000, B=3500, A=5500, S=8500**(生成時に `problems.base_damage` へ保存。参照は必ず DB の値)
- 速度倍率: `1 + 0.3 × (1 − elapsed)`、`elapsed` = 週開始からの経過割合(0〜1にクランプ)
- 先制ボーナス(first blood): その問題で全ユーザー中最初の AC なら **×1.5**
- `damage = floor(base_damage × 速度倍率 × 先制)`
- ダメージが入るのは **各ユーザー・各問題で最初の AC のみ**。再提出や週終了後の AC は damage=0(週終了後も練習提出は可能)
- ボスHP: `boss_hp = max(boss_hp - damage, 0)`。0 になったら `defeated_at` を記録
- **ボス撃破後**も週が active な間は、初 AC の damage・EXP・ランキング計上は満額のまま(オーバーキル歓迎。boss_hp は 0 未満にならないだけ)
- EXP: `exp += damage`。週終了時、撃破成功していれば参加者(週間ダメージ>0)全員に **+2000 EXP**

## 4. ボスHP(generator が週生成時に設定)

`boss_max_hp = 20000 × count_active_players()`(RPC。直近14日に提出したユーザー数、最低3)

## 5. レーティング(実装は `finalize_week()` 内のみ)

- 初期レート **1000**
- 週の参加者(damage>0)を週間ダメージ降順に順位付け(同点は同順位 = rank())
- `perf = round(1200 + 800 × (N − rank) / max(N − 1, 1))`(N=参加者数。1位=2000, 最下位=1200)
- `new_rating = old + round((perf − old) / 4)`
- 色分け(UI): 2000+ 赤 / 1800+ 橙 / 1600+ 黄 / 1400+ 青 / 1200+ 水 / 1000+ 緑 / 800+ 茶 / それ未満 灰

## 6. 週次サイクル

- タイムゾーンは **Asia/Tokyo**。週 = 月曜 00:00 JST 〜 翌月曜 00:00 JST
- cron(Lightsail): 毎週月曜 00:00 JST に `generator rotate`
- `raid_weeks.status`: `upcoming`(生成済み・未公開)→ `active`(挑戦可能)→ `ended`(解説・全提出コード公開)

## 7. 閲覧可否(RLS が強制。web はこれに合わせた UI を出すだけ)

| データ | active 週 | ended 週 |
|---|---|---|
| 問題文・サンプルケース | ✅ 全員 | ✅ 全員 |
| 非サンプルのテストケース | ❌(service role のみ) | ❌(service role のみ) |
| 解説・公式解 (`problem_editorials`) | ❌ | ✅ 全員 |
| 他人の提出コード | その問題を自分が AC 済みなら ✅ | ✅ 全員 |
| 自分の提出 | ✅ | ✅ |
| 掲示板 | ✅(アイデア相談は協力プレイの一部として歓迎) | ✅ |

サイト全体がログイン必須(GitHub OAuth / Supabase Auth)。anon には何も見えない。

## 8. DB 関数(シグネチャは 0001_init.sql が正)

**クライアント(authenticated)から呼べる(anon には execute なし):**
- `get_week_leaderboard(p_week_id uuid)` — 週間ダメージランキング(コードは含まない)
- `get_problem_stats(p_week_id uuid)` — 問題ごとの AC 人数・挑戦人数
- `get_recent_activity(p_week_id uuid, p_limit int)` — AC フィード(誰がどの問題で何ダメージ)

**クライアントから読める集計ビュー(`security_invoker`、基底テーブルの RLS が適用):**
- `week_participant_counts(week_id, participant_count)` — 週ごとの参加者数(rating_events 起点)
- `board_thread_post_counts(thread_id, post_count)` — スレッドごとの投稿数
- 用途: 行を取得してクライアントで数えると PostgREST の `max_rows=1000` で静かに打ち切られるため、件数表示はこれらを使う

**service role のみ(anon/authenticated には execute なし):**
- `claim_pending_submissions(p_limit int)` — pending(および running のままクレームから5分以上経過した stale 提出)を running にして返す(bridge 用)
- `apply_submission_result(p_submission_id, p_status, p_passed_count, p_total_count, p_exec_time_ms, p_memory_kb)` — 判定確定+ダメージ反映
- `finalize_week(p_week_id)` / `activate_week(p_week_id)` / `count_active_players()` — generator 用

## 9. 環境変数

**web** (`web/.env.local` / Vercel):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**judge-bridge** (`judge-bridge/.env` / Lightsail):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JUDGE0_URL=http://server:2358 # Judge0 の URL。infra/docker-compose.yml のサービス名は server(compose 外から叩くなら http://localhost:2358 等)
JUDGE0_AUTH_TOKEN=
POLL_INTERVAL_MS=2000
EXECUTOR=judge0               # judge0(既定) | local(開発専用: サンドボックスなしでホスト実行)
```

**generator** (`generator/.env` / Lightsail):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JUDGE0_URL=http://server:2358 # Judge0 の URL。infra/docker-compose.yml のサービス名は server(compose 外から叩くなら http://localhost:2358 等)
JUDGE0_AUTH_TOKEN=
AI_PROVIDER=claude-cli        # claude-cli(ローカル: claude setup-token) | anthropic-api(本番)
ANTHROPIC_API_KEY=            # anthropic-api のときのみ必須
AI_MODEL=claude-sonnet-5      # 任意で claude-opus-4-8 等に変更可
```

## 10. generator CLI コマンド

- `generate` — 次週(week_number = 最大+1)のボスと問題6問を生成し `upcoming` で保存。公式解を Judge0 で全ケース検証、失敗した問題は作り直し(問題ごと最大3リトライ)
- `rotate` — `finalize_week(現行active)` → `generate`(未生成なら)→ `activate_week(次週)`。cron からはこれだけを呼ぶ
- `finalize --week <n>` / `activate --week <n>` — 手動リカバリ用

生成物の要件: 問題文は日本語・Markdown(数式は `$...$` の KaTeX)。各問題にサンプル2件以上+非サンプル10件以上。`problem_editorials.official_solutions` は `[{"language": "python", "code": "..."}]` 形式で最低 python を含む。
