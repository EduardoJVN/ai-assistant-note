import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepgramAdapter } from '../deepgram.adapter.js';

const mockSend = vi.fn();
const mockFinish = vi.fn();
const mockOn = vi.fn();

vi.mock('ws', () => ({ default: vi.fn() }));

vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn(() => ({
    listen: {
      live: vi.fn(() => ({
        on: mockOn,
        send: mockSend,
        finish: mockFinish,
      })),
    },
  })),
  LiveTranscriptionEvents: {
    Open: 'Open',
    Close: 'Close',
    Transcript: 'Transcript',
    Error: 'Error',
  },
}));

function getHandler(event: string): ((...args: unknown[]) => void) | undefined {
  return mockOn.mock.calls.find(([e]: [string]) => e === event)?.[1] as
    | ((...args: unknown[]) => void)
    | undefined;
}

describe('DeepgramAdapter', () => {
  let adapter: DeepgramAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DeepgramAdapter('test-api-key');
  });

  it('createSession returns a session object with the required interface', () => {
    const session = adapter.createSession();

    expect(session).toHaveProperty('sendChunk');
    expect(session).toHaveProperty('close');
    expect(session).toHaveProperty('onTranscript');
    expect(session).toHaveProperty('onError');
  });

  it('queues chunks sent before the Open event', () => {
    const session = adapter.createSession();
    const chunk = Buffer.from([1, 2, 3]);

    session.sendChunk(chunk);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('flushes queued chunks when the Open event fires', () => {
    const session = adapter.createSession();
    const chunk1 = Buffer.from([1]);
    const chunk2 = Buffer.from([2]);

    session.sendChunk(chunk1);
    session.sendChunk(chunk2);
    getHandler('Open')?.();

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenNthCalledWith(1, chunk1);
    expect(mockSend).toHaveBeenNthCalledWith(2, chunk2);
  });

  it('forwards chunks directly once the connection is open', () => {
    const session = adapter.createSession();
    getHandler('Open')?.();

    const chunk = Buffer.from([1, 2, 3]);
    session.sendChunk(chunk);

    expect(mockSend).toHaveBeenCalledWith(chunk);
  });

  it('close calls finish on the Deepgram connection', () => {
    const session = adapter.createSession();

    session.close();

    expect(mockFinish).toHaveBeenCalledOnce();
  });

  it('calls onTranscript callback when Deepgram emits a transcript', () => {
    const session = adapter.createSession();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);

    getHandler('Transcript')?.({
      channel: { alternatives: [{ transcript: 'hola mundo' }] },
      is_final: true,
    });

    expect(onTranscript).toHaveBeenCalledWith({ transcript: 'hola mundo', isFinal: true });
  });

  it('does not call onTranscript when transcript is empty', () => {
    const session = adapter.createSession();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);

    getHandler('Transcript')?.({
      channel: { alternatives: [{ transcript: '' }] },
      is_final: false,
    });

    expect(onTranscript).not.toHaveBeenCalled();
  });

  it('calls onError with the error message when Deepgram emits a string error', () => {
    const session = adapter.createSession();
    const onError = vi.fn();
    session.onError(onError);

    getHandler('Error')?.('connection lost');

    expect(onError).toHaveBeenCalledWith(new Error('connection lost'));
  });

  it('calls onError with serialized message when Deepgram emits an object error', () => {
    const session = adapter.createSession();
    const onError = vi.fn();
    session.onError(onError);

    getHandler('Error')?.({ code: 401, message: 'Invalid credentials' });

    expect(onError).toHaveBeenCalledWith(
      new Error('{"code":401,"message":"Invalid credentials"}'),
    );
  });

  it('calls onError with error.message when Deepgram emits an Error instance', () => {
    const session = adapter.createSession();
    const onError = vi.fn();
    session.onError(onError);

    getHandler('Error')?.(new Error('websocket closed'));

    expect(onError).toHaveBeenCalledWith(new Error('websocket closed'));
  });
});
