import { describe, it, expect, beforeEach } from 'vitest';
import { BaseController } from '@infra/entry-points/base.controller.js';
import type { HttpResponse, ErrorResponse } from '@infra/entry-points/base.controller.js';
import { DomainError } from '@shared/errors/domain.error.js';
import { NotFoundError } from '@shared/errors/not-found.error.js';

class TestNotFoundError extends NotFoundError {
  constructor() {
    super('resource not found');
  }
}

class TestDomainError extends DomainError {
  constructor() {
    super('business rule violated');
  }
}

class TestController extends BaseController {
  async run<T>(action: () => Promise<T>): Promise<HttpResponse> {
    return this.handleRequest(
      action,
      (result) => ({ status: 200, body: result }),
      (error: ErrorResponse) => ({ status: error.status, body: { error: error.message } }),
    );
  }
}

describe('BaseController', () => {
  let controller: TestController;

  beforeEach(() => {
    controller = new TestController();
  });

  it('returns 200 with result on happy path', async () => {
    const response = await controller.run(() => Promise.resolve({ id: '1' }));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '1' });
  });

  it('returns 404 when NotFoundError is thrown', async () => {
    const response = await controller.run(() => Promise.reject(new TestNotFoundError()));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'resource not found' });
  });

  it('returns 400 when a generic DomainError is thrown', async () => {
    const response = await controller.run(() => Promise.reject(new TestDomainError()));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'business rule violated' });
  });

  it('returns 500 for unknown errors', async () => {
    const response = await controller.run(
      () => Promise.reject(new Error('unexpected DB failure')),
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});
