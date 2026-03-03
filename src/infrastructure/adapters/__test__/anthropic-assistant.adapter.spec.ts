import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicAssistantAdapter } from '../anthropic-assistant.adapter.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

describe('AnthropicAssistantAdapter', () => {
  let adapter: AnthropicAssistantAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AnthropicAssistantAdapter('test-api-key');
  });

  it('returns the text content from the API response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Claro, ¿en qué te ayudo?' }],
    });

    const result = await adapter.respond('Hola');

    expect(result).toBe('Claro, ¿en qué te ayudo?');
  });

  it('calls the API with the correct model and transcript', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    });

    await adapter.respond('dime la hora');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        messages: [{ role: 'user', content: 'dime la hora' }],
      }),
    );
  });

  it('returns empty string when content block is not text type', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
    });

    const result = await adapter.respond('test');

    expect(result).toBe('');
  });

  it('propagates API errors', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit'));

    await expect(adapter.respond('test')).rejects.toThrow('API rate limit');
  });
});
