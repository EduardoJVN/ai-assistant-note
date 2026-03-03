export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
}

export interface ITranscriptionSession {
  sendChunk(chunk: Buffer): void;
  close(): void;
  onTranscript(callback: (result: TranscriptionResult) => void): void;
  onError(callback: (error: Error) => void): void;
}

export interface ITranscriptionProvider {
  createSession(): ITranscriptionSession;
}
