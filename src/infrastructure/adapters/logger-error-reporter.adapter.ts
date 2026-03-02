import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';

export class LoggerErrorReporter implements IErrorReporter {
  constructor(private readonly logger: ILogger) {}

  report(error: Error, context?: Record<string, unknown>): void {
    this.logger.error(error.message, {
      errorName: error.name,
      stack: error.stack,
      ...context,
    });
  }
}
