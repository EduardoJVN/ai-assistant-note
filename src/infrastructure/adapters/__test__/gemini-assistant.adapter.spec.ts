import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAssistantAdapter } from '../gemini-assistant.adapter.js';

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

describe('GeminiAssistantAdapter', () => {
  let adapter: GeminiAssistantAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GeminiAssistantAdapter('test-api-key');
  });

  it('returns the text content from the API response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Hola, soy Gemini.' },
    });

    const result = await adapter.respond('Hola');

    expect(result).toBe('Hola, soy Gemini.');
  });

  it('calls generateContent with the transcript', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'ok' },
    });

    await adapter.respond('cuéntame algo');

    expect(mockGenerateContent).toHaveBeenCalledWith('cuéntame algo');
  });

  it('propagates API errors', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini API error'));

    await expect(adapter.respond('test')).rejects.toThrow('Gemini API error');
  });
});
