import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioStreamSocketGateway } from '../audio-stream.socket-gateway.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type { Socket } from 'socket.io';

class MockErrorReporter implements IErrorReporter {
  report = vi.fn();
}

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}

class MockSocket {
  id = 'socket-test-id';
  private handlers = new Map<string, (...args: unknown[]) => unknown>();
  emitted: { event: string; data: unknown }[] = [];

  on(event: string, handler: (...args: unknown[]) => unknown): void {
    this.handlers.set(event, handler);
  }

  emit(event: string, data: unknown): void {
    this.emitted.push({ event, data });
  }

  async trigger(event: string, ...args: unknown[]): Promise<void> {
    const handler = this.handlers.get(event);
    if (handler) await handler(...args);
  }
}

describe('AudioStreamSocketGateway', () => {
  let reporter: MockErrorReporter;
  let logger: MockLogger;
  let gateway: AudioStreamSocketGateway;
  let socket: MockSocket;

  beforeEach(() => {
    reporter = new MockErrorReporter();
    logger = new MockLogger();
    gateway = new AudioStreamSocketGateway(reporter, logger);
    socket = new MockSocket();
    gateway.register(socket as unknown as Socket);
  });

  it('registers the audio-stream listener on the socket', () => {
    expect(socket['handlers'].has('audio-stream')).toBe(true);
  });

  it('logs receipt with socketId and byte length when a chunk arrives', async () => {
    const chunk = Buffer.from([1, 2, 3, 4]);

    await socket.trigger('audio-stream', chunk);

    expect(logger.info).toHaveBeenCalledWith('Audio chunk received', {
      socketId: 'socket-test-id',
      bytes: 4,
    });
  });

  it('emits audio-stream:error when processing fails', async () => {
    logger.info.mockImplementation(() => {
      throw new Error('unexpected failure');
    });

    await socket.trigger('audio-stream', Buffer.from([1]));

    expect(socket.emitted).toContainEqual(expect.objectContaining({ event: 'audio-stream:error' }));
  });

  it('reports unexpected errors to IErrorReporter', async () => {
    const boom = new Error('unexpected failure');
    logger.info.mockImplementation(() => {
      throw boom;
    });

    await socket.trigger('audio-stream', Buffer.from([1]));

    expect(reporter.report).toHaveBeenCalledWith(boom, { type: 'unhandled-socket-error' });
  });

  it('does not report errors for empty chunks', async () => {
    await socket.trigger('audio-stream', Buffer.alloc(0));

    expect(reporter.report).not.toHaveBeenCalled();
  });
});
