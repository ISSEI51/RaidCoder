// RaidCoder generator CLI (CONTRACT §10)
//
//   node dist/index.js generate [--skip-validation]
//   node dist/index.js rotate   [--skip-validation]
//   node dist/index.js finalize --week <n>
//   node dist/index.js activate --week <n>
import { DateTime } from 'luxon';
import { loadConfig, type Config } from './config.js';
import { BASE_DAMAGE, HP_PER_PLAYER } from './constants.js';
import { Db, type RaidWeekRow, type WeekPayload } from './db.js';
import { Judge0Client } from './judge0.js';
import { log, warn } from './log.js';
import { buildProblem } from './pipeline/problem.js';
import { generateTheme } from './pipeline/theme.js';
import { createProvider } from './providers/index.js';
import { isWeekExpired, nextWeekBounds } from './week.js';

interface CliFlags {
  week?: number;
  skipValidation: boolean;
}

function parseFlags(args: string[]): CliFlags {
  const flags: CliFlags = { skipValidation: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--week') {
      const value = args[++i];
      if (!value || !/^\d+$/.test(value)) {
        throw new Error('--week には正の整数を指定してください');
      }
      flags.week = Number(value);
    } else if (arg === '--skip-validation') {
      flags.skipValidation = true;
    } else {
      throw new Error(`不明な引数です: ${arg}`);
    }
  }
  return flags;
}

function printUsage(): void {
  console.log(`使い方: node dist/index.js <command> [options]

コマンド:
  generate [--skip-validation]  次週(week_number = 既存最大+1)のボス+問題6問を生成し upcoming で保存
  rotate   [--skip-validation]  週次ローテーション: finalize(現行active) → generate(未生成なら) → activate(次週)
  finalize --week <n>           指定週を手動で finalize(リカバリ用)
  activate --week <n>           指定週を手動で activate(リカバリ用)

オプション:
  --skip-validation             Judge0 での検証を飛ばして保存(ローカル等 Judge0 が使えない環境向け)
  --week <n>                    対象の week_number`);
}

function createJudge0(config: Config, skipValidation: boolean): Judge0Client | null {
  if (skipValidation) {
    warn('--skip-validation: Judge0 での検証を行いません。隠しテストケースは生成されず、サンプルのみが保存されます');
    return null;
  }
  if (!config.judge0Url) {
    throw new Error(
      'JUDGE0_URL が設定されていません。Judge0 が使えない環境では --skip-validation を指定してください',
    );
  }
  return new Judge0Client(config.judge0Url, config.judge0AuthToken);
}

/**
 * 次週(upcoming)を用意して返す。冪等:
 * - 完全な upcoming 週が既にあればそれを返す
 * - 期限切れの upcoming 週(rotate が activate 前に落ちた残骸)は、そのまま activate すると
 *   全提出が created_at >= ends_at となり丸1週間ダメージ0の壊れた週になるため、
 *   finalize せずに削除して現行週として作り直す
 * - 不完全な upcoming 週(過去の途中失敗の残骸)があれば削除して作り直す
 *
 * 返す週の ends_at は現在時刻より十分先であることが保証される
 * (再生成時の週境界は nextWeekBounds が期限切れにならないよう選ぶ)。
 */
async function ensureUpcomingWeek(
  config: Config,
  db: Db,
  skipValidation: boolean,
): Promise<RaidWeekRow> {
  const existing = await db.getOldestUpcomingWeek();
  if (existing) {
    if (isWeekExpired(DateTime.fromISO(existing.ends_at), DateTime.now())) {
      warn(
        `期限切れの upcoming 週(第${existing.week_number}週、ends_at=${existing.ends_at})を削除して現行週として再生成します`,
      );
      await db.deleteWeek(existing.id);
    } else if (await db.isWeekComplete(existing.id, !skipValidation)) {
      log(`第${existing.week_number}週「${existing.boss_name}」は生成済みです (upcoming)`);
      return existing;
    } else {
      warn(`不完全な upcoming 週(第${existing.week_number}週)を削除して再生成します`);
      await db.deleteWeek(existing.id);
    }
  }

  const provider = createProvider(config);
  const judge0 = createJudge0(config, skipValidation);

  const latest = await db.getLatestWeek();
  const weekNumber = (latest?.week_number ?? 0) + 1;
  const bounds = nextWeekBounds(
    DateTime.now(),
    latest ? DateTime.fromISO(latest.ends_at) : undefined,
  );
  log(
    `第${weekNumber}週を生成します: ${bounds.startsAt.toISO()} 〜 ${bounds.endsAt.toISO()} (Asia/Tokyo 月曜週)`,
  );

  // コール1: 週テーマ
  const theme = await generateTheme(provider, weekNumber);
  log(`ボス決定: 「${theme.boss_name}」 — ${theme.boss_flavor.replaceAll('\n', ' ')}`);
  for (const p of theme.problems) {
    log(`  [${p.rank}] ${p.title} (${p.topic})`);
  }

  // 問題ごとに生成(失敗した問題のみ最大3リトライ)
  const built = [];
  for (const outline of theme.problems) {
    built.push(await buildProblem(provider, judge0, theme, outline));
  }

  // ボスHP = 20000 × count_active_players() (CONTRACT §4)
  const activePlayers = await db.countActivePlayers();
  const bossMaxHp = HP_PER_PLAYER * activePlayers;
  log(`アクティブプレイヤー数: ${activePlayers} → boss_max_hp = ${bossMaxHp}`);

  const startsAtIso = bounds.startsAt.toISO();
  const endsAtIso = bounds.endsAt.toISO();
  if (!startsAtIso || !endsAtIso) {
    throw new Error('週境界の ISO 変換に失敗しました');
  }

  const payload: WeekPayload = {
    weekNumber,
    startsAt: startsAtIso,
    endsAt: endsAtIso,
    bossName: theme.boss_name,
    bossFlavor: theme.boss_flavor,
    bossMaxHp,
    problems: built.map((b) => ({
      rank: b.outline.rank,
      title: b.outline.title,
      statementMd: b.generated.statement_md,
      timeLimitMs: b.generated.time_limit_ms,
      baseDamage: BASE_DAMAGE[b.outline.rank],
      testCases: b.testCases,
      editorialMd: b.generated.editorial_md,
      officialSolutions: [{ language: 'python', code: b.generated.official_solution_py }],
    })),
  };

  log('週を一括保存中...');
  const weekId = await db.saveWeek(payload);
  log(`第${weekNumber}週「${theme.boss_name}」を upcoming で保存しました (id: ${weekId})`);

  const saved = await db.getWeekByNumber(weekNumber);
  if (!saved) {
    throw new Error(`保存した第${weekNumber}週を読み直せませんでした`);
  }
  return saved;
}

async function cmdGenerate(config: Config, db: Db, flags: CliFlags): Promise<void> {
  await ensureUpcomingWeek(config, db, flags.skipValidation);
}

async function cmdRotate(config: Config, db: Db, flags: CliFlags): Promise<void> {
  const now = DateTime.now();

  // 1. 現行 active 週の finalize(冪等: 終了時刻を過ぎている場合のみ)
  const active = await db.getActiveWeek();
  if (active) {
    const endsAt = DateTime.fromISO(active.ends_at);
    // cron が数十秒早く起動しても終了できるよう猶予(ROTATE_GRACE_MINUTES)を持たせる
    if (isWeekExpired(endsAt, now)) {
      log(`第${active.week_number}週「${active.boss_name}」を finalize します`);
      const result = await db.finalizeWeek(active.id);
      log(`finalize_week 結果: ${JSON.stringify(result)}`);
    } else {
      log(
        `active な第${active.week_number}週はまだ終了時刻 (${active.ends_at}) 前のため、rotate をスキップします`,
      );
      return;
    }
  } else {
    log('active な週がないため finalize をスキップします');
  }

  // 2. 次週が未生成なら generate(生成済みならそのまま利用)
  const next = await ensureUpcomingWeek(config, db, flags.skipValidation);

  // 3. 次週を activate(ensureUpcomingWeek が返す週は ends_at が十分先であることを保証済み)
  const result = await db.activateWeek(next.id);
  log(`第${next.week_number}週「${next.boss_name}」を activate しました: ${JSON.stringify(result)}`);
}

async function cmdFinalize(db: Db, weekNumber: number): Promise<void> {
  const week = await db.getWeekByNumber(weekNumber);
  if (!week) {
    throw new Error(`第${weekNumber}週が見つかりません`);
  }
  const result = await db.finalizeWeek(week.id);
  log(`finalize_week(第${weekNumber}週) 結果: ${JSON.stringify(result)}`);
}

async function cmdActivate(db: Db, weekNumber: number): Promise<void> {
  const week = await db.getWeekByNumber(weekNumber);
  if (!week) {
    throw new Error(`第${weekNumber}週が見つかりません`);
  }
  if (isWeekExpired(DateTime.fromISO(week.ends_at), DateTime.now())) {
    warn(
      `第${weekNumber}週の ends_at (${week.ends_at}) は既に過ぎています。` +
        'activate しても以後の AC はすべてダメージ0になります。通常は rotate の再実行で削除・再生成してください',
    );
  }
  const result = await db.activateWeek(week.id);
  log(`activate_week(第${weekNumber}週) 結果: ${JSON.stringify(result)}`);
}

function requireWeek(flags: CliFlags): number {
  if (flags.week === undefined) {
    throw new Error('--week <n> を指定してください');
  }
  return flags.week;
}

async function main(): Promise<void> {
  // .env があれば読み込む(Docker 等では環境変数で直接渡されるため無ければ無視)
  try {
    process.loadEnvFile();
  } catch {
    // .env なし
  }

  const [, , command, ...rest] = process.argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    process.exitCode = command ? 0 : 1;
    return;
  }

  const flags = parseFlags(rest);
  const config = loadConfig();
  const db = new Db(config.supabaseUrl, config.supabaseServiceRoleKey);

  switch (command) {
    case 'generate':
      await cmdGenerate(config, db, flags);
      break;
    case 'rotate':
      await cmdRotate(config, db, flags);
      break;
    case 'finalize':
      await cmdFinalize(db, requireWeek(flags));
      break;
    case 'activate':
      await cmdActivate(db, requireWeek(flags));
      break;
    default:
      printUsage();
      throw new Error(`不明なコマンドです: ${command}`);
  }
}

main().catch((err: unknown) => {
  console.error(`[${new Date().toISOString()}] ❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
