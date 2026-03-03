import type { TranscriptionResult } from '@domain/transcription/ports/transcription-provider.port.js';

export interface IVoiceAgentSession {
  sendChunk(chunk: Buffer): void;
  close(): void;
  onTranscript(callback: (result: TranscriptionResult) => void): void;
  onAgentAudio(callback: (audio: Buffer) => void): void;
  onAgentText(callback: (text: string) => void): void;
  onError(callback: (error: Error) => void): void;
}

export interface IVoiceAgentProvider {
  createSession(): IVoiceAgentSession;
}
