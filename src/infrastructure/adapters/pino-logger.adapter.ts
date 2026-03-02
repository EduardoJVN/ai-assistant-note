import pino from 'pino';
import type { Logger as PinoInstance } from 'pino';
import type { ILogger } from '@domain/ports/logger.port';

export class Logger implements ILogger {
  private logger: PinoInstance;

  constructor(level: string = 'info') {
    this.logger = pino({
      level,
      // Aquí podrías añadir pino-pretty si estás en desarrollo
      transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.error(context, message);
    } else {
      this.logger.error(message);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }
}
