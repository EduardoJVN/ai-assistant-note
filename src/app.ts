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
import { DeepgramAdapter } from '@infra/adapters/deepgram.adapter.js';
import { createProductModule } from '@infra/modules/product.module.js';
import { createAudioStreamSocketModule } from '@infra/modules/audio-stream.socket-module.js';

async function bootstrap() {
  const logger = new Logger();
  const errorReporter = new LoggerErrorReporter(logger);
  const transcriptionProvider = new DeepgramAdapter(ENV.DEEPGRAM_API_KEY);

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

  createSocketServer(
    httpServer,
    [createAudioStreamSocketModule(logger, errorReporter, transcriptionProvider)],
    logger,
  );

  httpServer.listen(ENV.PORT, () => {
    reportBootstrap(logger);
  });
}

bootstrap();
