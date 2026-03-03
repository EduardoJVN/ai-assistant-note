import type { ILogger } from '@domain/ports/logger.port.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ITranscriptionProvider } from '@domain/transcription/ports/transcription-provider.port.js';
import type { ITTSProvider } from '@domain/ai/ports/tts-provider.port.js';
import type { GenerateResponseUseCase } from '@application/ai/use-cases/generate-response.use-case.js';
import { AudioStreamSocketGateway } from '@infra/entry-points/audio-stream.socket-gateway.js';

export function createAudioStreamSocketModule(
  logger: ILogger,
  errorReporter: IErrorReporter,
  transcriptionProvider: ITranscriptionProvider,
  generateResponseUseCase: GenerateResponseUseCase,
  responseMode: 'text' | 'voice',
  ttsProvider: ITTSProvider | null,
): AudioStreamSocketGateway {
  return new AudioStreamSocketGateway(
    errorReporter,
    logger,
    transcriptionProvider,
    generateResponseUseCase,
    responseMode,
    ttsProvider,
  );
}
