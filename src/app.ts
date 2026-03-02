import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ENV } from '@infra/config/env.config.js';
import { reportBootstrap } from '@infra/config/bootstrap-reporter.js';
import { Logger } from '@infra/adapters/pino-logger.adapter.js';
import { registerRoutes } from '@infra/entry-points/router.js';
import { createProductModule } from '@infra/modules/product.module.js';

async function bootstrap() {
  const logger = new Logger();

  const app = express();
  app.use(express.json());
  app.use(
    registerRoutes({
      product: createProductModule(logger),
    }),
  );

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { message: err.message });
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(ENV.PORT, () => {
    reportBootstrap(logger);
  });
}

bootstrap();
