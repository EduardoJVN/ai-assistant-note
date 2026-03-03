import { createClient } from '@deepgram/sdk';
import type { ITTSProvider } from '@domain/ai/ports/tts-provider.port.js';

export class DeepgramTTSAdapter implements ITTSProvider {
  constructor(private readonly apiKey: string) {}

  async synthesize(text: string): Promise<Buffer> {
    const client = createClient(this.apiKey);

    const response = await client.speak.request(
      { text },
      { model: 'aura-2-thalia-es', encoding: 'mp3' },
    );

    const stream = await response.getStream();
    if (!stream) {
      throw new Error('Deepgram TTS returned no audio stream');
    }

    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(result);
  }
}
