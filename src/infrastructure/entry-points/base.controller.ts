import { DomainError } from '@shared/errors/domain.error.js';
import { NotFoundError } from '@shared/errors/not-found.error.js';

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
        return onError({ status: 500, message: 'Internal server error' });
      }
    }
  }
}
