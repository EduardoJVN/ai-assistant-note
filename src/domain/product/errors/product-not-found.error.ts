import { NotFoundError } from '@shared/errors/not-found.error.js';

export class ProductNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Product not found: ${id}`);
  }
}
