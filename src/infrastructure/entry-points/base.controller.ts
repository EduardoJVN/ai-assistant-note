import { DomainError } from '@shared/errors/domain.error.js';
import { NotFoundError } from '@shared/errors/not-found.error.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';

export interface HttpRequest {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

export interface ErrorResponse {
  status: number;
  message: string;
}

export abstract class BaseController {
  constructor(private readonly errorReporter: IErrorReporter) {}

  protected async handleRequest<T>(
    action: () => Promise<T>,
    onSuccess: (result: T) => HttpResponse,
    onError: (error: ErrorResponse) => HttpResponse,
  ): Promise<HttpResponse> {
    try {
      const result = await action();
      return onSuccess(result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return onError({ status: 404, message: error.message });
      } else if (error instanceof DomainError) {
        return onError({ status: 400, message: error.message });
      } else {
        const err = error instanceof Error ? error : new Error(String(error));
        this.errorReporter.report(err, { type: 'unhandled-controller-error' });
        return onError({ status: 500, message: 'Internal server error' });
      }
    }
  }
}
