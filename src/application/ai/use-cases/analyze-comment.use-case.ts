import type { IAgentProvider, AgentAnalysis } from '@domain/ai/ports/agent-provider.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';

export class AnalyzeCommentUseCase {
  constructor(
    private readonly agent: IAgentProvider,
    private readonly logger: ILogger
  ) {}

  async execute(comment: string): Promise<AgentAnalysis> {
    this.logger.info('Iniciando análisis de IA para comentario', { length: comment.length });

    if (!comment || comment.length < 5) {
      this.logger.warn('Comentario demasiado corto para análisis');
      return { label: 'neutral', confidence: 1 };
    }

    try {
      const result = await this.agent.analyzeSentiment(comment);
      this.logger.info('Análisis completado con éxito', { result });
      return result;
    } catch (error) {
      this.logger.error('Error en el agente de IA', { error });
      throw new Error('No se pudo procesar el análisis en este momento',
        { 
          cause: error 
        }
      );
    }
  }
}