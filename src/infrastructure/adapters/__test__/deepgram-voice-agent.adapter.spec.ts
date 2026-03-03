import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepgramVoiceAgentAdapter } from '../deepgram-voice-agent.adapter.js';
import type { VoiceAgentConfig } from '../deepgram-voice-agent.adapter.js';

// ── Mock AgentLiveClient ──────────────────────────────────────────────────────

class MockAgentLiveClient {
  private handlers = new Map<string, ((...args: unknown[]) => void)[]>();

  configure = vi.fn();
  send = vi.fn();
  disconnect = vi.fn();

  on(event: string, handler: (...args: unknown[]) => void): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
  }

  emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((h) => h(...args));
  }
}

const mockAgentInstance = new MockAgentLiveClient();
const mockAgentFactory = vi.fn(() => mockAgentInstance);

vi.mock('@deepgram/sdk', () => {
  const AgentEvents = {
    Open: 'Open',
    Close: 'Close',
    Error: 'Error',
    Audio: 'Audio',
    AgentAudioDone: 'AgentAudioDone',
    ConversationText: 'ConversationText',
    UserStartedSpeaking: 'UserStartedSpeaking',
    AgentThinking: 'AgentThinking',
    AgentStartedSpeaking: 'AgentStartedSpeaking',
    InjectionRefused: 'InjectionRefused',
    SettingsApplied: 'SettingsApplied',
    Welcome: 'Welcome',
    FunctionCallRequest: 'FunctionCallRequest',
    PromptUpdated: 'PromptUpdated',
    SpeakUpdated: 'SpeakUpdated',
    Unhandled: 'Unhandled',
  };

  return {
    AgentEvents,
    createClient: vi.fn(() => ({ agent: mockAgentFactory })),
  };
});

// ── Test helpers ──────────────────────────────────────────────────────────────

const defaultConfig: VoiceAgentConfig = {
  llmProvider: 'anthropic',
  llmModel: 'claude-sonnet-4-6',
};

function makeSession(config: VoiceAgentConfig = defaultConfig) {
  const adapter = new DeepgramVoiceAgentAdapter('test-key', config);
  const session = adapter.createSession();
  return { session, agent: mockAgentInstance };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeepgramVoiceAgentAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset handlers between tests
    (mockAgentInstance as unknown as { handlers: Map<string, unknown[]> }).handlers = new Map();
    mockAgentInstance.configure.mockClear();
    mockAgentInstance.send.mockClear();
    mockAgentInstance.disconnect.mockClear();
  });

  it('calls configure after connection opens', () => {
    const { agent } = makeSession();

    agent.emit('Open');

    expect(agent.configure).toHaveBeenCalledOnce();
    expect(agent.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({
          think: expect.objectContaining({
            provider: { type: 'anthropic', model: 'claude-sonnet-4-6' },
          }),
        }),
      }),
    );
  });

  it('flushes pending chunks after Open', () => {
    const { session, agent } = makeSession();
    const chunk = Buffer.from([1, 2, 3]);

    session.sendChunk(chunk);
    expect(agent.send).not.toHaveBeenCalled();

    agent.emit('Open');

    expect(agent.send).toHaveBeenCalledWith(chunk);
  });

  it('sends chunks directly when connection is open', () => {
    const { session, agent } = makeSession();
    agent.emit('Open');

    const chunk = Buffer.from([4, 5, 6]);
    session.sendChunk(chunk);

    expect(agent.send).toHaveBeenCalledWith(chunk);
  });

  it('calls onTranscript for user ConversationText events', () => {
    const { session, agent } = makeSession();
    const cb = vi.fn();
    session.onTranscript(cb);

    agent.emit('ConversationText', { role: 'user', content: 'hola mundo' });

    expect(cb).toHaveBeenCalledWith({ transcript: 'hola mundo', isFinal: true });
  });

  it('does not call onTranscript for assistant ConversationText events', () => {
    const { session, agent } = makeSession();
    const cb = vi.fn();
    session.onTranscript(cb);

    agent.emit('ConversationText', { role: 'assistant', content: 'hola' });

    expect(cb).not.toHaveBeenCalled();
  });

  it('calls onAgentText for assistant ConversationText events', () => {
    const { session, agent } = makeSession();
    const cb = vi.fn();
    session.onAgentText(cb);

    agent.emit('ConversationText', { role: 'assistant', content: 'Claro, te ayudo.' });

    expect(cb).toHaveBeenCalledWith('Claro, te ayudo.');
  });

  it('concatenates audio chunks and fires onAgentAudio on AgentAudioDone', () => {
    const { session, agent } = makeSession();
    const cb = vi.fn();
    session.onAgentAudio(cb);

    agent.emit('Audio', Buffer.from([1, 2]));
    agent.emit('Audio', Buffer.from([3, 4]));
    agent.emit('AgentAudioDone');

    expect(cb).toHaveBeenCalledOnce();
    expect([...(cb.mock.calls[0][0] as Buffer)]).toEqual([1, 2, 3, 4]);
  });

  it('does not fire onAgentAudio when no audio chunks were received', () => {
    const { session, agent } = makeSession();
    const cb = vi.fn();
    session.onAgentAudio(cb);

    agent.emit('AgentAudioDone');

    expect(cb).not.toHaveBeenCalled();
  });

  it('resets audio buffer after each AgentAudioDone', () => {
    const { session, agent } = makeSession();
    const cb = vi.fn();
    session.onAgentAudio(cb);

    agent.emit('Audio', Buffer.from([1]));
    agent.emit('AgentAudioDone');

    agent.emit('Audio', Buffer.from([2]));
    agent.emit('AgentAudioDone');

    expect(cb).toHaveBeenCalledTimes(2);
    expect([...(cb.mock.calls[1][0] as Buffer)]).toEqual([2]);
  });

  it('calls onError with an Error when error event fires', () => {
    const { session, agent } = makeSession();
    const cb = vi.fn();
    session.onError(cb);

    agent.emit('Error', new Error('ws disconnected'));

    expect(cb).toHaveBeenCalledWith(expect.any(Error));
    expect((cb.mock.calls[0][0] as Error).message).toBe('ws disconnected');
  });

  it('coerces string errors to Error instances', () => {
    const { session, agent } = makeSession();
    const cb = vi.fn();
    session.onError(cb);

    agent.emit('Error', 'network timeout');

    expect((cb.mock.calls[0][0] as Error).message).toBe('network timeout');
  });

  it('calls disconnect on close()', () => {
    const { session, agent } = makeSession();
    session.close();
    expect(agent.disconnect).toHaveBeenCalledOnce();
  });

  it('uses config values in the configure call', () => {
    const { agent } = makeSession({
      llmProvider: 'openai',
      llmModel: 'gpt-4o-mini',
      sttModel: 'nova-2',
      ttsModel: 'aura-2-andromeda-en',
      language: 'en',
      systemPrompt: 'Be concise.',
    });

    agent.emit('Open');

    expect(agent.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({
          language: 'en',
          listen: { provider: { type: 'deepgram', model: 'nova-2' } },
          think: expect.objectContaining({
            provider: { type: 'openai', model: 'gpt-4o-mini' },
            prompt: 'Be concise.',
          }),
          speak: { provider: { type: 'deepgram', model: 'aura-2-andromeda-en' } },
        }),
      }),
    );
  });
});
