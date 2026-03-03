import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepgramTTSAdapter } from '../deepgram-tts.adapter.js';

const mockGetStream = vi.fn();
const mockRequest = vi.fn();

vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn(() => ({
    speak: {
      request: mockRequest,
    },
  })),
}));

function makeStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    },
  });
}

describe('DeepgramTTSAdapter', () => {
  let adapter: DeepgramTTSAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DeepgramTTSAdapter('test-key');
    mockRequest.mockResolvedValue({ getStream: mockGetStream });
  });

  it('returns a Buffer with concatenated audio chunks', async () => {
    mockGetStream.mockResolvedValue(makeStream([new Uint8Array([1, 2]), new Uint8Array([3, 4])]));

    const result = await adapter.synthesize('Hola mundo');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3, 4]);
  });

  it('calls speak.request with the correct text and model', async () => {
    mockGetStream.mockResolvedValue(makeStream([new Uint8Array([0])]));

    await adapter.synthesize('probando TTS');

    expect(mockRequest).toHaveBeenCalledWith(
      { text: 'probando TTS' },
      expect.objectContaining({ encoding: 'mp3' }),
    );
  });

  it('throws when getStream returns null', async () => {
    mockGetStream.mockResolvedValue(null);

    await expect(adapter.synthesize('test')).rejects.toThrow('no audio stream');
  });

  it('propagates request errors', async () => {
    mockRequest.mockRejectedValue(new Error('Deepgram API error'));

    await expect(adapter.synthesize('test')).rejects.toThrow('Deepgram API error');
  });
});
