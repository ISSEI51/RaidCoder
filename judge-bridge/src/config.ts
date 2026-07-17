// 環境変数の読み込みと検証(CONTRACT §9 の judge-bridge の項)

export type ExecutorKind = 'judge0' | 'local';

export interface Config {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  judge0Url: string;
  judge0AuthToken: string;
  pollIntervalMs: number;
  executor: ExecutorKind;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません(judge-bridge/.env.example を参照)`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const executor = env.EXECUTOR ?? 'judge0';
  if (executor !== 'judge0' && executor !== 'local') {
    throw new Error(`EXECUTOR の値が不正です: "${executor}"(judge0 または local を指定)`);
  }

  const pollIntervalMs = Number.parseInt(env.POLL_INTERVAL_MS ?? '2000', 10);
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new Error(`POLL_INTERVAL_MS の値が不正です: "${env.POLL_INTERVAL_MS}"`);
  }

  return {
    supabaseUrl: required(env, 'SUPABASE_URL'),
    supabaseServiceRoleKey: required(env, 'SUPABASE_SERVICE_ROLE_KEY'),
    // Judge0 の設定は EXECUTOR=judge0 のときのみ必須
    judge0Url: executor === 'judge0' ? required(env, 'JUDGE0_URL').replace(/\/+$/u, '') : (env.JUDGE0_URL ?? ''),
    judge0AuthToken: executor === 'judge0' ? required(env, 'JUDGE0_AUTH_TOKEN') : (env.JUDGE0_AUTH_TOKEN ?? ''),
    pollIntervalMs,
    executor,
  };
}
