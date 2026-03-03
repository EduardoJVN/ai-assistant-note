import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioStreamSocketGateway } from '../audio-stream.socket-gateway.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type {
  ITranscriptionProvider,
  ITranscriptionSession,
  TranscriptionResult,
} from '@domain/transcription/ports/transcription-provider.port.js';
import type { ITTSProvider } from '@domain/ai/ports/tts-provider.port.js';
import type { GenerateResponseUseCase } from '@application/ai/use-cases/generate-response.use-case.js';
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

class MockGenerateResponseUseCase {
  execute = vi.fn<
    [{ transcript: string }],
    Promise<{ response: string }>
  >();
}

class MockTTSProvider implements ITTSProvider {
  synthesize = vi.fn<[string], Promise<Buffer>>();
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

function makeGateway(
  reporter: MockErrorReporter,
  logger: MockLogger,
  provider: MockTranscriptionProvider,
  useCase: MockGenerateResponseUseCase,
  responseMode: 'text' | 'voice' = 'text',
  ttsProvider: ITTSProvider | null = null,
): AudioStreamSocketGateway {
  return new AudioStreamSocketGateway(
    reporter,
    logger,
    provider,
    useCase as unknown as GenerateResponseUseCase,
    responseMode,
    ttsProvider,
  );
}

describe('AudioStreamSocketGateway', () => {
  let reporter: MockErrorReporter;
  let logger: MockLogger;
  let provider: MockTranscriptionProvider;
  let useCase: MockGenerateResponseUseCase;
  let gateway: AudioStreamSocketGateway;
  let socket: MockSocket;

  beforeEach(() => {
    reporter = new MockErrorReporter();
    logger = new MockLogger();
    provider = new MockTranscriptionProvider();
    useCase = new MockGenerateResponseUseCase();
    gateway = makeGateway(reporter, logger, provider, useCase);
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

  it('emits audio-stream:error via handleEvent when sendChunk throws', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    provider.session.sendChunk.mockImplementation(() => {
      throw new Error('sendChunk failed');
    });

    await socket.trigger('audio-stream', Buffer.from([2]));

    expect(socket.emitted).toContainEqual(expect.objectContaining({ event: 'audio-stream:error' }));
  });

  describe('AI response — text mode', () => {
    it('emits assistant:response when transcript is final and non-empty', async () => {
      useCase.execute.mockResolvedValue({ response: 'Claro, te ayudo.' });

      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: 'hola', isFinal: true });

      // wait for microtask queue
      await Promise.resolve();
      await Promise.resolve();

      expect(socket.emitted).toContainEqual({
        event: 'assistant:response',
        data: { text: 'Claro, te ayudo.' },
      });
    });

    it('does not call useCase for interim transcripts', async () => {
      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: 'hol', isFinal: false });

      await Promise.resolve();

      expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('does not call useCase when final transcript is blank', async () => {
      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: '   ', isFinal: true });

      await Promise.resolve();

      expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('does not emit assistant:response when useCase returns empty string', async () => {
      useCase.execute.mockResolvedValue({ response: '' });

      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: 'algo', isFinal: true });

      await Promise.resolve();
      await Promise.resolve();

      expect(socket.emitted.some((e) => e.event === 'assistant:response')).toBe(false);
    });

    it('logs error and does not crash when useCase throws', async () => {
      useCase.execute.mockRejectedValue(new Error('API down'));

      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: 'test', isFinal: true });

      await Promise.resolve();
      await Promise.resolve();

      expect(logger.error).toHaveBeenCalledWith(
        'AI response generation failed',
        expect.objectContaining({ socketId: 'socket-test-id' }),
      );
    });

    it('logs error as string when useCase rejects with a non-Error value', async () => {
      useCase.execute.mockRejectedValue('string-error');

      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: 'test', isFinal: true });

      await Promise.resolve();
      await Promise.resolve();

      expect(logger.error).toHaveBeenCalledWith(
        'AI response generation failed',
        expect.objectContaining({ error: 'string-error' }),
      );
    });
  });

  describe('AI response — voice mode', () => {
    let ttsProvider: MockTTSProvider;

    beforeEach(() => {
      ttsProvider = new MockTTSProvider();
      gateway = makeGateway(reporter, logger, provider, useCase, 'voice', ttsProvider);
      socket = new MockSocket();
      gateway.register(socket as unknown as Socket);
    });

    it('emits assistant:audio buffer when TTS succeeds', async () => {
      useCase.execute.mockResolvedValue({ response: 'Aquí tu respuesta.' });
      const fakeAudio = Buffer.from([0xff, 0xfb]);
      ttsProvider.synthesize.mockResolvedValue(fakeAudio);

      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: 'hola', isFinal: true });

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(socket.emitted).toContainEqual({
        event: 'assistant:audio',
        data: fakeAudio,
      });
    });

    it('calls synthesize with the AI response text', async () => {
      useCase.execute.mockResolvedValue({ response: 'respuesta de prueba' });
      ttsProvider.synthesize.mockResolvedValue(Buffer.from([0]));

      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: 'pregunta', isFinal: true });

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(ttsProvider.synthesize).toHaveBeenCalledWith('respuesta de prueba');
    });

    it('logs error when TTS throws and does not crash', async () => {
      useCase.execute.mockResolvedValue({ response: 'algo' });
      ttsProvider.synthesize.mockRejectedValue(new Error('TTS failed'));

      await socket.trigger('audio-stream', Buffer.from([1]));
      provider.session.emitTranscript({ transcript: 'test', isFinal: true });

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
