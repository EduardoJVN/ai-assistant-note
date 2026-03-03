import { createClient, AgentEvents } from '@deepgram/sdk';
import type { AgentLiveClient } from '@deepgram/sdk';
import WS from 'ws';
import type {
  IVoiceAgentProvider,
  IVoiceAgentSession,
} from '@domain/voice-agent/ports/voice-agent-provider.port.js';
import type { TranscriptionResult } from '@domain/transcription/ports/transcription-provider.port.js';

export interface VoiceAgentConfig {
  sttModel?: string;
  llmProvider: string;
  llmModel: string;
  ttsModel?: string;
  systemPrompt?: string;
  language?: string;
}

class DeepgramVoiceAgentSession implements IVoiceAgentSession {
  private readonly connection: AgentLiveClient;
  private transcriptCallback?: (result: TranscriptionResult) => void;
  private agentAudioCallback?: (audio: Buffer) => void;
  private agentTextCallback?: (text: string) => void;
  private errorCallback?: (error: Error) => void;
  private audioChunks: Buffer[] = [];
  private isOpen = false;
  private pendingChunks: Buffer[] = [];

  constructor(apiKey: string, config: VoiceAgentConfig) {
    // Same ws-override as DeepgramAdapter — needed in Node.js 22+
    const client = createClient(apiKey, {
      global: { websocket: { client: WS as unknown as typeof WebSocket } },
    });

    this.connection = client.agent();

    this.connection.on(AgentEvents.Open, () => {
      this.isOpen = true;

      this.connection.configure({
        audio: {
          input: { encoding: 'linear16', sample_rate: 16000 },
          output: { encoding: 'mp3' },
        },
        agent: {
          language: config.language ?? 'es',
          listen: {
            provider: { type: 'deepgram', model: config.sttModel ?? 'nova-3' },
          },
          think: {
            provider: { type: config.llmProvider, model: config.llmModel },
            prompt: config.systemPrompt ?? 'Eres un asistente conciso. Responde siempre en español con respuestas breves y directas.',
          },
          speak: {
            provider: { type: 'deepgram', model: config.ttsModel ?? 'aura-2-thalia-es' },
          },
        },
      });

      this.pendingChunks.forEach((chunk) => this.connection.send(chunk));
      this.pendingChunks = [];
    });

    this.connection.on(AgentEvents.Audio, (data: Buffer) => {
      this.audioChunks.push(data);
    });

    this.connection.on(AgentEvents.AgentAudioDone, () => {
      if (this.audioChunks.length === 0) return;

      const total = this.audioChunks.reduce((sum, c) => sum + c.length, 0);
      const combined = Buffer.allocUnsafe(total);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        chunk.copy(combined, offset);
        offset += chunk.length;
      }
      this.audioChunks = [];

      this.agentAudioCallback?.(combined);
    });

    this.connection.on(AgentEvents.ConversationText, (data: { role: string; content: string }) => {
      if (data.role === 'user' && this.transcriptCallback) {
        this.transcriptCallback({ transcript: data.content, isFinal: true });
      }
      if (data.role === 'assistant' && this.agentTextCallback) {
        this.agentTextCallback(data.content);
      }
    });

    this.connection.on(AgentEvents.Error, (error: unknown) => {
      if (!this.errorCallback) return;
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.errorCallback(new Error(message));
    });

    this.connection.on(AgentEvents.Close, () => {
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
    this.connection.disconnect();
  }

  onTranscript(callback: (result: TranscriptionResult) => void): void {
    this.transcriptCallback = callback;
  }

  onAgentAudio(callback: (audio: Buffer) => void): void {
    this.agentAudioCallback = callback;
  }

  onAgentText(callback: (text: string) => void): void {
    this.agentTextCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
}

export class DeepgramVoiceAgentAdapter implements IVoiceAgentProvider {
  constructor(
    private readonly apiKey: string,
    private readonly config: VoiceAgentConfig,
  ) {}

  createSession(): IVoiceAgentSession {
    return new DeepgramVoiceAgentSession(this.apiKey, this.config);
  }
}
