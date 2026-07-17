// 環境変数の読み込み (CONTRACT §9 の generator の項の変数のみ使用)

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
