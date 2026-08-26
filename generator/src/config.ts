// 環境変数の読み込み (CONTRACT §9 の generator の項の変数のみ使用)
import { warn } from './log.js';
import type { EmailConfig } from './notify.js';

export type AiProviderName = 'claude-cli' | 'anthropic-api';

export interface Config {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  judge0Url: string | undefined;
  judge0AuthToken: string | undefined;
  aiProvider: AiProviderName;
  anthropicApiKey: string | undefined;
  aiModel: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`環境変数 ${name} が設定されていません (generator/.env.example を参照)`);
  }
  return value.trim();
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

export function loadConfig(): Config {
  const aiProvider = optional('AI_PROVIDER') ?? 'claude-cli';
  if (aiProvider !== 'claude-cli' && aiProvider !== 'anthropic-api') {
    throw new Error(`AI_PROVIDER は claude-cli または anthropic-api を指定してください (現在値: ${aiProvider})`);
  }
  return {
    supabaseUrl: required('SUPABASE_URL'),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    judge0Url: optional('JUDGE0_URL'),
    judge0AuthToken: optional('JUDGE0_AUTH_TOKEN'),
    aiProvider,
    anthropicApiKey: optional('ANTHROPIC_API_KEY'),
    aiModel: optional('AI_MODEL') ?? 'claude-sonnet-5',
  };
}

/** 既定の送信先 API。Bearer 認証 + JSON body の API なら差し替えられる */
const DEFAULT_EMAIL_ENDPOINT = 'https://api.resend.com/emails';

/**
 * rotate の実行結果を送るメール設定(未設定なら通知しない)。
 * loadConfig() 自体が失敗したときにも通知したいので、Config とは独立して読む。
 */
export function readRotateEmailConfig(): EmailConfig | undefined {
  const apiKey = optional('ROTATE_EMAIL_API_KEY');
  const from = optional('ROTATE_EMAIL_FROM');
  const to = optional('ROTATE_EMAIL_TO')
    ?.split(',')
    .map((address) => address.trim())
    .filter((address) => address !== '');

  if (!apiKey || !from || !to || to.length === 0) {
    // 一部だけ設定されている状態は設定漏れなので、黙って無効化せず警告する
    if (apiKey || from || to?.length) {
      warn(
        'ROTATE_EMAIL_API_KEY / ROTATE_EMAIL_FROM / ROTATE_EMAIL_TO の一部が未設定のため、メール通知は無効です',
      );
    }
    return undefined;
  }

  return {
    apiKey,
    from,
    to,
    endpoint: optional('ROTATE_EMAIL_ENDPOINT') ?? DEFAULT_EMAIL_ENDPOINT,
  };
}
