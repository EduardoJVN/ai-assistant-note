import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateResponseUseCase } from '../generate-response.use-case.js';
import type { IAssistantResponseProvider } from '@domain/ai/ports/assistant-response.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';

class MockProvider implements IAssistantResponseProvider {
  respond = vi.fn<[string], Promise<string>>();
}

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}

describe('GenerateResponseUseCase', () => {
  let provider: MockProvider;
  let logger: MockLogger;
  let useCase: GenerateResponseUseCase;

  beforeEach(() => {
    provider = new MockProvider();
    logger = new MockLogger();
    useCase = new GenerateResponseUseCase(provider, logger);
  });

  it('returns the provider response for a valid transcript', async () => {
    provider.respond.mockResolvedValue('Hola, ¿en qué te puedo ayudar?');

    const result = await useCase.execute({ transcript: 'Hola' });

    expect(result).toEqual({ response: 'Hola, ¿en qué te puedo ayudar?' });
    expect(provider.respond).toHaveBeenCalledWith('Hola');
  });

  it('returns empty response without calling provider when transcript is empty', async () => {
    const result = await useCase.execute({ transcript: '' });

    expect(result).toEqual({ response: '' });
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it('returns empty response without calling provider when transcript is only whitespace', async () => {
    const result = await useCase.execute({ transcript: '   ' });

    expect(result).toEqual({ response: '' });
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it('propagates provider errors', async () => {
    const boom = new Error('Anthropic API error');
    provider.respond.mockRejectedValue(boom);

    await expect(useCase.execute({ transcript: 'test input' })).rejects.toThrow('Anthropic API error');
  });
});
