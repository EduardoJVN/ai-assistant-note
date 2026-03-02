import { DomainError } from '@shared/errors/domain.error.js';

export class InvalidProductPriceError extends DomainError {
  constructor(price: number) {
    super(`Product price must be greater than 0, got ${price}`);
  }
}
