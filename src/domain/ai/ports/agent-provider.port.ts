export interface AgentAnalysis {
  label: 'positivo' | 'negativo' | 'neutral';
  confidence: number;
}

export interface IAgentProvider {
  analyzeSentiment(text: string): Promise<AgentAnalysis>;
}