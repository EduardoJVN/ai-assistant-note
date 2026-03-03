import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import type { ListenLiveClient } from '@deepgram/sdk';
import WS from 'ws';
import type {
  ITranscriptionProvider,
  ITranscriptionSession,
  TranscriptionResult,
} from '@domain/transcription/ports/transcription-provider.port.js';

class DeepgramSession implements ITranscriptionSession {
  private readonly connection: ListenLiveClient;
  private transcriptCallback?: (result: TranscriptionResult) => void;
  private errorCallback?: (error: Error) => void;
  private isOpen = false;
  private pendingChunks: Buffer[] = [];

  constructor(apiKey: string) {
    // Node.js 22+ exposes globalThis.WebSocket (undici), which makes the Deepgram SDK
    // use browser-style subprotocol auth instead of Authorization headers.
    // Forcing the ws package here ensures the SDK always uses header-based auth.
    const client = createClient(apiKey, {
      global: { websocket: { client: WS as unknown as typeof WebSocket } },
    });

    this.connection = client.listen.live({
      model: 'nova-2',
      language: 'es',
      smart_format: true,
      encoding: 'webm-opus',
    });

    this.connection.on(LiveTranscriptionEvents.Open, () => {
      this.isOpen = true;
      this.pendingChunks.forEach((chunk) => this.connection.send(chunk));
      this.pendingChunks = [];
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript ?? '';
      if (transcript && this.transcriptCallback) {
        this.transcriptCallback({ transcript, isFinal: data.is_final as boolean });
      }
    });

    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      if (this.errorCallback) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error);
        this.errorCallback(new Error(message));
      }
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      this.isOpen = false;
    });
  }

  sendChunk(chunk: Buffer): void {
    if (this.isOpen) {
      this.connection.send(chunk);
    } else {
      this.pendingChunks.push(chunk);
    }
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
