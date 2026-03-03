import Anthropic from '@anthropic-ai/sdk';
import type { IAssistantResponseProvider } from '@domain/ai/ports/assistant-response.port.js';

export class AnthropicAssistantAdapter implements IAssistantResponseProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async respond(transcript: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'Eres un asistente conciso. Responde siempre en español con respuestas breves y directas.',
      messages: [{ role: 'user', content: transcript }],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      return '';
    }
    return block.text;
  }
}
