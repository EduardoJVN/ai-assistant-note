import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseSocketGateway } from '../socket-gateway.js';
import type { SocketErrorResponse } from '../socket-gateway.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import { DomainError } from '@shared/errors/domain.error.js';
import { NotFoundError } from '@shared/errors/not-found.error.js';
import type { Socket } from 'socket.io';

class MockErrorReporter implements IErrorReporter {
  report = vi.fn();
}

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

class TestGateway extends BaseSocketGateway {
  register(_socket: Socket): void {}

  async run<T>(
    action: () => Promise<T>,
    onSuccess: (result: T) => void,
    onError: (error: SocketErrorResponse) => void,
  ): Promise<void> {
    return this.handleEvent(action, onSuccess, onError);
  }
}

describe('BaseSocketGateway', () => {
  let reporter: MockErrorReporter;
  let gateway: TestGateway;

  beforeEach(() => {
    reporter = new MockErrorReporter();
    gateway = new TestGateway(reporter);
  });

  it('calls onSuccess with the result on happy path', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await gateway.run(() => Promise.resolve({ id: '1' }), onSuccess, onError);

    expect(onSuccess).toHaveBeenCalledWith({ id: '1' });
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError with code 404 when NotFoundError is thrown', async () => {
    const onError = vi.fn();

    await gateway.run(() => Promise.reject(new TestNotFoundError()), vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith({ code: 404, message: 'resource not found' });
  });

  it('calls onError with code 400 when DomainError is thrown', async () => {
    const onError = vi.fn();

    await gateway.run(() => Promise.reject(new TestDomainError()), vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith({ code: 400, message: 'business rule violated' });
  });

  it('calls onError with code 500 for unknown errors', async () => {
    const onError = vi.fn();

    await gateway.run(() => Promise.reject(new Error('db crashed')), vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith({ code: 500, message: 'Internal server error' });
  });

  it('does not report expected domain errors to IErrorReporter', async () => {
    await gateway.run(() => Promise.reject(new TestNotFoundError()), vi.fn(), vi.fn());
    await gateway.run(() => Promise.reject(new TestDomainError()), vi.fn(), vi.fn());

    expect(reporter.report).not.toHaveBeenCalled();
  });

  it('reports unknown errors to IErrorReporter', async () => {
    const boom = new Error('db crashed');

    await gateway.run(() => Promise.reject(boom), vi.fn(), vi.fn());

    expect(reporter.report).toHaveBeenCalledOnce();
    expect(reporter.report).toHaveBeenCalledWith(boom, { type: 'unhandled-socket-error' });
  });
});
