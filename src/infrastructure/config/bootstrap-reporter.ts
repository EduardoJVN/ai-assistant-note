import type { ILogger } from '@domain/ports/logger.port.js';
import { ENV } from './env.config.js';

export const reportBootstrap = (logger: ILogger) => {
  const line = '─'.repeat(50);

  logger.info(line);
  logger.info(`🚀 ${ENV.APP_NAME.toUpperCase()} INICIADA`);
  logger.info(line);
  logger.info(`📦 Versión: ${ENV.VERSION}`);
  logger.info(`🌍 Entorno: ${ENV.NODE_ENV}`);
  logger.info(`📫 Host: ${ENV.HOST}`);
  logger.info(`🔌 Puerto:  ${ENV.PORT}`);
  logger.info(`🟢 Node:    ${process.version}`);
  logger.info(`🔗 URL:    http://${ENV.HOST}:${ENV.PORT}`);
  logger.info(line);
};
