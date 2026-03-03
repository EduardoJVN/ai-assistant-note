import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioStreamSocketGateway } from '../audio-stream.socket-gateway.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type {
  ITranscriptionProvider,
  ITranscriptionSession,
  TranscriptionResult,
} from '@domain/transcription/ports/transcription-provider.port.js';
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

class MockSession implements ITranscriptionSession {
  sendChunk = vi.fn();
  close = vi.fn();
  private transcriptCb?: (result: TranscriptionResult) => void;
  private errorCb?: (error: Error) => void;

  onTranscript(callback: (result: TranscriptionResult) => void): void {
    this.transcriptCb = callback;
  }
  onError(callback: (error: Error) => void): void {
    this.errorCb = callback;
  }
  emitTranscript(result: TranscriptionResult): void {
    this.transcriptCb?.(result);
  }
  emitError(error: Error): void {
    this.errorCb?.(error);
  }
}

class MockTranscriptionProvider implements ITranscriptionProvider {
  session = new MockSession();
  createSession = vi.fn(() => this.session);
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
  let provider: MockTranscriptionProvider;
  let gateway: AudioStreamSocketGateway;
  let socket: MockSocket;

  beforeEach(() => {
    reporter = new MockErrorReporter();
    logger = new MockLogger();
    provider = new MockTranscriptionProvider();
    gateway = new AudioStreamSocketGateway(reporter, logger, provider);
    socket = new MockSocket();
    gateway.register(socket as unknown as Socket);
  });

  it('does not create a session until the first audio chunk arrives', () => {
    expect(provider.createSession).not.toHaveBeenCalled();
  });

  it('opens a transcription session on the first chunk', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));

    expect(provider.createSession).toHaveBeenCalledOnce();
  });

  it('reuses the same session for subsequent chunks', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    await socket.trigger('audio-stream', Buffer.from([2]));

    expect(provider.createSession).toHaveBeenCalledOnce();
    expect(provider.session.sendChunk).toHaveBeenCalledTimes(2);
  });

  it('forwards each chunk to the session', async () => {
    const chunk = Buffer.from([1, 2, 3]);

    await socket.trigger('audio-stream', chunk);

    expect(provider.session.sendChunk).toHaveBeenCalledWith(chunk);
  });

  it('emits transcription event to socket when Deepgram responds', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    provider.session.emitTranscript({ transcript: 'hola mundo', isFinal: true });

    expect(socket.emitted).toContainEqual({
      event: 'transcription',
      data: { transcript: 'hola mundo', isFinal: true },
    });
  });

  it('closes the session on socket disconnect', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    await socket.trigger('disconnect');

    expect(provider.session.close).toHaveBeenCalledOnce();
  });

  it('does not crash on disconnect if no session was opened', async () => {
    await expect(socket.trigger('disconnect')).resolves.toBeUndefined();
  });

  it('reports session errors to IErrorReporter', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    const boom = new Error('deepgram connection lost');
    provider.session.emitError(boom);

    expect(reporter.report).toHaveBeenCalledWith(boom, {
      type: 'deepgram-session-error',
      socketId: 'socket-test-id',
    });
  });

  it('emits audio-stream:error to socket on session error', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    provider.session.emitError(new Error('deepgram connection lost'));

    expect(socket.emitted).toContainEqual(expect.objectContaining({ event: 'audio-stream:error' }));
  });
});
