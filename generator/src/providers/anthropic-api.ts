// 本番用プロバイダ: Anthropic API (@anthropic-ai/sdk)
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './types.js';

/** 問題文・解説・コードを含む長い出力に耐えるよう十分大きく取る */
const MAX_TOKENS = 64000;

export class AnthropicApiProvider implements AIProvider {
  private readonly client: Anthropic;

  constructor(
    private readonly model: string,
    apiKey: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(system: string, user: string): Promise<string> {
    // 長い出力は非ストリーミングだと HTTP タイムアウトの恐れがあるためストリーミングで受ける
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new Error('Anthropic API がリクエストを拒否しました (stop_reason: refusal)');
    }
    if (message.stop_reason === 'max_tokens') {
      throw new Error(`Anthropic API の応答が max_tokens (${MAX_TOKENS}) で打ち切られました`);
    }

    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }
}
