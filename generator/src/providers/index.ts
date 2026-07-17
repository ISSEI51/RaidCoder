// AI_PROVIDER 環境変数によるプロバイダ切り替え
import type { Config } from '../config.js';
import { AnthropicApiProvider } from './anthropic-api.js';
import { ClaudeCliProvider } from './claude-cli.js';
import type { AIProvider } from './types.js';

export type { AIProvider } from './types.js';

export function createProvider(config: Config): AIProvider {
  if (config.aiProvider === 'anthropic-api') {
    if (!config.anthropicApiKey) {
      throw new Error('AI_PROVIDER=anthropic-api の場合は ANTHROPIC_API_KEY が必須です');
    }
    return new AnthropicApiProvider(config.aiModel, config.anthropicApiKey);
  }
  return new ClaudeCliProvider(config.aiModel);
}
