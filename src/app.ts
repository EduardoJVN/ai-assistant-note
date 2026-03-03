import { createServer } from 'node:http';
import { join } from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ENV } from '@infra/config/env.config.js';
import { reportBootstrap } from '@infra/config/bootstrap-reporter.js';
import { registerProcessErrorHandlers } from '@infra/config/process-error-handler.js';
import { Logger } from '@infra/adapters/pino-logger.adapter.js';
import { LoggerErrorReporter } from '@infra/adapters/logger-error-reporter.adapter.js';
import { registerRoutes } from '@infra/entry-points/router.js';
import { createSocketServer } from '@infra/entry-points/socket-server.js';
import { createProductModule } from '@infra/modules/product.module.js';
// ── Voice Agent (default mode) ─────────────────────────────────────────────
import { DeepgramVoiceAgentAdapter } from '@infra/adapters/deepgram-voice-agent.adapter.js';
import { createVoiceAgentSocketModule } from '@infra/modules/voice-agent.socket-module.js';
// ── Pipeline (legacy mode) ─────────────────────────────────────────────────
import { DeepgramAdapter } from '@infra/adapters/deepgram.adapter.js';
import { AnthropicAssistantAdapter } from '@infra/adapters/anthropic-assistant.adapter.js';
import { GeminiAssistantAdapter } from '@infra/adapters/gemini-assistant.adapter.js';
import { DeepgramTTSAdapter } from '@infra/adapters/deepgram-tts.adapter.js';
import { GenerateResponseUseCase } from '@application/ai/use-cases/generate-response.use-case.js';
import { createAudioStreamSocketModule } from '@infra/modules/audio-stream.socket-module.js';
import type { BaseSocketGateway } from '@infra/entry-points/socket-gateway.js';

async function bootstrap() {
  const logger = new Logger();
  const errorReporter = new LoggerErrorReporter(logger);

  registerProcessErrorHandlers(errorReporter, logger);

  const app = express();
  app.use(express.json());
  app.use(express.static(join(process.cwd(), 'public')));
  app.use(
    registerRoutes({
      product: createProductModule(logger, errorReporter),
    }),
  );

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    errorReporter.report(err, { type: 'express-error-handler' });
    res.status(500).json({ error: 'Internal server error' });
  });

  const httpServer = createServer(app);

  let socketGateway: BaseSocketGateway;

  if (ENV.AGENT_MODE === 'voice-agent') {
    const voiceAgentAdapter = new DeepgramVoiceAgentAdapter(ENV.DEEPGRAM_API_KEY, {
      llmProvider: 'anthropic',
      llmModel: 'claude-sonnet-4-6',
    });
    socketGateway = createVoiceAgentSocketModule(logger, errorReporter, voiceAgentAdapter);
  } else {
    // ── Pipeline (legacy) ────────────────────────────────────────────────────
    const transcriptionProvider = new DeepgramAdapter(ENV.DEEPGRAM_API_KEY);
    const assistantAdapter =
      ENV.AI_PROVIDER === 'gemini'
        ? new GeminiAssistantAdapter(ENV.GEMINI_API_KEY!)
        : new AnthropicAssistantAdapter(ENV.ANTHROPIC_API_KEY!);
    const generateResponseUseCase = new GenerateResponseUseCase(assistantAdapter, logger);
    const ttsAdapter =
      ENV.RESPONSE_MODE === 'voice' ? new DeepgramTTSAdapter(ENV.DEEPGRAM_API_KEY) : null;

    socketGateway = createAudioStreamSocketModule(
      logger,
      errorReporter,
      transcriptionProvider,
      generateResponseUseCase,
      ENV.RESPONSE_MODE,
      ttsAdapter,
    );
  }

  createSocketServer(httpServer, [socketGateway], logger);

  httpServer.listen(ENV.PORT, () => {
    reportBootstrap(logger);
  });
}

bootstrap();
