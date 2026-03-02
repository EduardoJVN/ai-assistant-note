import { describe, it, expect } from 'vitest';
import { DomainError } from '../domain.error.js';

class ConcreteDomainError extends DomainError {
  constructor() {
    super('something went wrong');
  }
}

describe('DomainError', () => {
  it('sets the message correctly', () => {
    const error = new ConcreteDomainError();
    expect(error.message).toBe('something went wrong');
  });

  it('sets name to the subclass constructor name', () => {
    const error = new ConcreteDomainError();
    expect(error.name).toBe('ConcreteDomainError');
  });

  it('is an instance of Error', () => {
    const error = new ConcreteDomainError();
    expect(error).toBeInstanceOf(Error);
  });
});
