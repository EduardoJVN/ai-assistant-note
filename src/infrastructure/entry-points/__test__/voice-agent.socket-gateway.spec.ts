import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceAgentSocketGateway } from '../voice-agent.socket-gateway.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type {
  IVoiceAgentProvider,
  IVoiceAgentSession,
} from '@domain/voice-agent/ports/voice-agent-provider.port.js';
import type { TranscriptionResult } from '@domain/transcription/ports/transcription-provider.port.js';
import type { Socket } from 'socket.io';

// ── Mocks ────────────────────────────────────────────────────────────────────

class MockErrorReporter implements IErrorReporter {
  report = vi.fn();
}

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}

class MockVoiceAgentSession implements IVoiceAgentSession {
  sendChunk = vi.fn();
  close = vi.fn();

  private transcriptCb?: (r: TranscriptionResult) => void;
  private agentAudioCb?: (audio: Buffer) => void;
  private agentTextCb?: (text: string) => void;
  private errorCb?: (err: Error) => void;

  onTranscript(cb: (r: TranscriptionResult) => void): void { this.transcriptCb = cb; }
  onAgentAudio(cb: (audio: Buffer) => void): void { this.agentAudioCb = cb; }
  onAgentText(cb: (text: string) => void): void { this.agentTextCb = cb; }
  onError(cb: (err: Error) => void): void { this.errorCb = cb; }

  emitTranscript(r: TranscriptionResult): void { this.transcriptCb?.(r); }
  emitAgentAudio(audio: Buffer): void { this.agentAudioCb?.(audio); }
  emitAgentText(text: string): void { this.agentTextCb?.(text); }
  emitError(err: Error): void { this.errorCb?.(err); }
}

class MockVoiceAgentProvider implements IVoiceAgentProvider {
  session = new MockVoiceAgentSession();
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('VoiceAgentSocketGateway', () => {
  let reporter: MockErrorReporter;
  let logger: MockLogger;
  let provider: MockVoiceAgentProvider;
  let gateway: VoiceAgentSocketGateway;
  let socket: MockSocket;

  beforeEach(() => {
    reporter = new MockErrorReporter();
    logger = new MockLogger();
    provider = new MockVoiceAgentProvider();
    gateway = new VoiceAgentSocketGateway(reporter, logger, provider);
    socket = new MockSocket();
    gateway.register(socket as unknown as Socket);
  });

  it('does not create a session until the first audio chunk arrives', () => {
    expect(provider.createSession).not.toHaveBeenCalled();
  });

  it('opens a voice agent session on the first chunk', async () => {
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

  it('emits transcription event when session fires onTranscript', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    provider.session.emitTranscript({ transcript: 'hola mundo', isFinal: true });

    expect(socket.emitted).toContainEqual({
      event: 'transcription',
      data: { transcript: 'hola mundo', isFinal: true },
    });
  });

  it('emits assistant:response when session fires onAgentText', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    provider.session.emitAgentText('Claro, te ayudo.');

    expect(socket.emitted).toContainEqual({
      event: 'assistant:response',
      data: { text: 'Claro, te ayudo.' },
    });
  });

  it('emits assistant:audio when session fires onAgentAudio', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    const audio = Buffer.from([0xff, 0xfb, 0x90]);
    provider.session.emitAgentAudio(audio);

    expect(socket.emitted).toContainEqual({
      event: 'assistant:audio',
      data: audio,
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
    const boom = new Error('voice agent disconnected');
    provider.session.emitError(boom);

    expect(reporter.report).toHaveBeenCalledWith(boom, {
      type: 'voice-agent-session-error',
      socketId: 'socket-test-id',
    });
  });

  it('emits audio-stream:error to socket on session error', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    provider.session.emitError(new Error('voice agent disconnected'));

    expect(socket.emitted).toContainEqual(
      expect.objectContaining({ event: 'audio-stream:error' }),
    );
  });

  it('emits audio-stream:error via handleEvent when sendChunk throws', async () => {
    await socket.trigger('audio-stream', Buffer.from([1]));
    provider.session.sendChunk.mockImplementation(() => {
      throw new Error('sendChunk failed');
    });

    await socket.trigger('audio-stream', Buffer.from([2]));

    expect(socket.emitted).toContainEqual(
      expect.objectContaining({ event: 'audio-stream:error' }),
    );
  });
});
