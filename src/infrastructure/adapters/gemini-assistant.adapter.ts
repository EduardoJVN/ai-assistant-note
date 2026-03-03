import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAssistantResponseProvider } from '@domain/ai/ports/assistant-response.port.js';

export class GeminiAssistantAdapter implements IAssistantResponseProvider {
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async respond(transcript: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: 'Eres un asistente conciso. Responde siempre en español con respuestas breves y directas.',
    });

    const result = await model.generateContent(transcript);
    return result.response.text();
  }
}
