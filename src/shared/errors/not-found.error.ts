import { DomainError } from './domain.error.js';

export abstract class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
