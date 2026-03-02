import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';

export function registerProcessErrorHandlers(reporter: IErrorReporter, logger: ILogger): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('uncaughtException — process will exit', {
      message: error.message,
      stack: error.stack,
    });
    reporter.report(error, { type: 'uncaughtException' });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('unhandledRejection — process will exit', {
      message: error.message,
      stack: error.stack,
    });
    reporter.report(error, { type: 'unhandledRejection' });
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received — shutting down gracefully');
    process.exit(0);
  });
}
