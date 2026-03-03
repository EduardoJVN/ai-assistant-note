export interface IAssistantResponseProvider {
  respond(transcript: string): Promise<string>;
}
