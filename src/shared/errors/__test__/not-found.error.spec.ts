import { describe, it, expect } from 'vitest';
import { DomainError } from '../domain.error.js';
import { NotFoundError } from '../not-found.error.js';

class ConcreteNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Entity not found: ${id}`);
  }
}

describe('NotFoundError', () => {
  it('sets the message correctly', () => {
    const error = new ConcreteNotFoundError('abc-123');
    expect(error.message).toBe('Entity not found: abc-123');
  });

  it('sets name to the subclass constructor name', () => {
    const error = new ConcreteNotFoundError('abc-123');
    expect(error.name).toBe('ConcreteNotFoundError');
  });

  it('is an instance of DomainError', () => {
    const error = new ConcreteNotFoundError('abc-123');
    expect(error).toBeInstanceOf(DomainError);
  });

  it('is an instance of Error', () => {
    const error = new ConcreteNotFoundError('abc-123');
    expect(error).toBeInstanceOf(Error);
  });
});
