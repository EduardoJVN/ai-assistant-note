import type { IAssistantResponseProvider } from '@domain/ai/ports/assistant-response.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type {
  GenerateResponseCommand,
  GenerateResponseResult,
} from '@application/ai/dto/generate-response.dto.js';

export class GenerateResponseUseCase {
  constructor(
    private readonly provider: IAssistantResponseProvider,
    private readonly logger: ILogger,
  ) {}

  async execute(command: GenerateResponseCommand): Promise<GenerateResponseResult> {
    const { transcript } = command;

    if (!transcript.trim()) {
      return { response: '' };
    }

    this.logger.info('Generating AI response', { transcript });

    const response = await this.provider.respond(transcript);

    this.logger.info('AI response generated', { length: response.length });

    return { response };
  }
}
