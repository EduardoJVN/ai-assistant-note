import { DomainError } from '@shared/errors/domain.error.js';

export class TranscriptionFailedError extends DomainError {
  constructor(reason: string) {
    super(`Transcription failed: ${reason}`);
  }
}
