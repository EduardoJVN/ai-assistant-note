export interface ITTSProvider {
  synthesize(text: string): Promise<Buffer>;
}
