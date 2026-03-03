import type { ILogger } from '@domain/ports/logger.port.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { IVoiceAgentProvider } from '@domain/voice-agent/ports/voice-agent-provider.port.js';
import { VoiceAgentSocketGateway } from '@infra/entry-points/voice-agent.socket-gateway.js';

export function createVoiceAgentSocketModule(
  logger: ILogger,
  errorReporter: IErrorReporter,
  voiceAgentProvider: IVoiceAgentProvider,
): VoiceAgentSocketGateway {
  return new VoiceAgentSocketGateway(errorReporter, logger, voiceAgentProvider);
}
