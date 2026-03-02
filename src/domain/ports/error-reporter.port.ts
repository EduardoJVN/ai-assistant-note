export interface IErrorReporter {
  report(error: Error, context?: Record<string, unknown>): void;
}
