import { DomainError } from '@shared/errors/domain.error.js';

export class InvalidProductNameError extends DomainError {
  constructor() {
    super('Product name cannot be empty');
  }
}
