import { DomainError } from '@shared/errors/domain.error.js';
import { NotFoundError } from '@shared/errors/not-found.error.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { Socket } from 'socket.io';

export interface SocketErrorResponse {
  code: number;
  message: string;
}

export abstract class BaseSocketGateway {
  constructor(protected readonly errorReporter: IErrorReporter) {}

  abstract register(socket: Socket): void;

  protected async handleEvent<T>(
    action: () => Promise<T>,
    onSuccess: (result: T) => void,
    onError: (error: SocketErrorResponse) => void,
  ): Promise<void> {
    try {
      const result = await action();
      onSuccess(result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        onError({ code: 404, message: error.message });
      } else if (error instanceof DomainError) {
        onError({ code: 400, message: error.message });
      } else {
        const err = error instanceof Error ? error : new Error(String(error));
        this.errorReporter.report(err, { type: 'unhandled-socket-error' });
        onError({ code: 500, message: 'Internal server error' });
      }
    }
  }
}
