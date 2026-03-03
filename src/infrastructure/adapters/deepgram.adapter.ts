import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import type { ListenLiveClient } from '@deepgram/sdk';
import type {
  ITranscriptionProvider,
  ITranscriptionSession,
  TranscriptionResult,
} from '@domain/transcription/ports/transcription-provider.port.js';

class DeepgramSession implements ITranscriptionSession {
  private readonly connection: ListenLiveClient;
  private transcriptCallback?: (result: TranscriptionResult) => void;
  private errorCallback?: (error: Error) => void;

  constructor(apiKey: string) {
    const client = createClient(apiKey);

    this.connection = client.listen.live({
      model: 'nova-2',
      language: 'es',
      smart_format: true,
      encoding: 'webm-opus',
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript ?? '';
      if (transcript && this.transcriptCallback) {
        this.transcriptCallback({ transcript, isFinal: data.is_final as boolean });
      }
    });

    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      if (this.errorCallback) {
        this.errorCallback(new Error(String(error)));
      }
    });
  }

  sendChunk(chunk: Buffer): void {
    this.connection.send(chunk);
  }

  close(): void {
    this.connection.finish();
  }

  onTranscript(callback: (result: TranscriptionResult) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
}

export class DeepgramAdapter implements ITranscriptionProvider {
  constructor(private readonly apiKey: string) {}

  createSession(): ITranscriptionSession {
    return new DeepgramSession(this.apiKey);
  }
}
