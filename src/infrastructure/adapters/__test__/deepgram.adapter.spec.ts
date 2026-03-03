import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepgramAdapter } from '../deepgram.adapter.js';

const mockSend = vi.fn();
const mockFinish = vi.fn();
const mockOn = vi.fn();

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
    Transcript: 'Transcript',
    Error: 'Error',
  },
}));

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

  it('sendChunk forwards the buffer to the Deepgram connection', () => {
    const session = adapter.createSession();
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

    const transcriptHandler = mockOn.mock.calls.find(([event]) => event === 'Transcript')?.[1];
    transcriptHandler?.({
      channel: { alternatives: [{ transcript: 'hola mundo' }] },
      is_final: true,
    });

    expect(onTranscript).toHaveBeenCalledWith({ transcript: 'hola mundo', isFinal: true });
  });

  it('does not call onTranscript when transcript is empty', () => {
    const session = adapter.createSession();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);

    const transcriptHandler = mockOn.mock.calls.find(([event]) => event === 'Transcript')?.[1];
    transcriptHandler?.({
      channel: { alternatives: [{ transcript: '' }] },
      is_final: false,
    });

    expect(onTranscript).not.toHaveBeenCalled();
  });

  it('calls onError callback when Deepgram emits an error', () => {
    const session = adapter.createSession();
    const onError = vi.fn();
    session.onError(onError);

    const errorHandler = mockOn.mock.calls.find(([event]) => event === 'Error')?.[1];
    errorHandler?.('connection lost');

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
