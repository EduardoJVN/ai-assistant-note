import type { IAgentProvider, AgentAnalysis } from '@domain/ai/ports/agent-provider.port.js';

export class MockAgentAdapter implements IAgentProvider {
  async analyzeSentiment(text: string): Promise<AgentAnalysis> {
    // Simulamos latencia de red
    await new Promise((resolve) => setTimeout(resolve, 500));

    const lowercaseText = text.toLowerCase();
    
    if (lowercaseText.includes('excelente') || lowercaseText.includes('bueno')) {
      return { label: 'positivo', confidence: 0.95 };
    }

    if (lowercaseText.includes('malo') || lowercaseText.includes('error')) {
      return { label: 'negativo', confidence: 0.88 };
    }

    return { label: 'neutral', confidence: 0.5 };
  }
}