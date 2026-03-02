import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoggerErrorReporter } from '../logger-error-reporter.adapter.js';
import type { ILogger } from '@domain/ports/logger.port.js';

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}

describe('LoggerErrorReporter', () => {
  let logger: MockLogger;
  let reporter: LoggerErrorReporter;

  beforeEach(() => {
    logger = new MockLogger();
    reporter = new LoggerErrorReporter(logger);
  });

  it('calls logger.error with the error message', () => {
    const error = new Error('something broke');

    reporter.report(error);

    expect(logger.error).toHaveBeenCalledWith(
      'something broke',
      expect.objectContaining({ errorName: 'Error', stack: error.stack }),
    );
  });

  it('merges extra context into the log call', () => {
    const error = new Error('db timeout');

    reporter.report(error, { type: 'unhandledRejection', requestId: 'req-42' });

    expect(logger.error).toHaveBeenCalledWith(
      'db timeout',
      expect.objectContaining({ type: 'unhandledRejection', requestId: 'req-42' }),
    );
  });

  it('preserves errorName from the error subclass', () => {
    class CustomError extends Error {
      constructor() {
        super('custom');
        this.name = 'CustomError';
      }
    }

    reporter.report(new CustomError());

    expect(logger.error).toHaveBeenCalledWith(
      'custom',
      expect.objectContaining({ errorName: 'CustomError' }),
    );
  });
});
