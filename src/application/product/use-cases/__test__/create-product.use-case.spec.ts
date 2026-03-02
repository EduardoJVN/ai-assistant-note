import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProductUseCase } from '../create-product.use-case.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import { Product } from '@domain/product/entities/product.entity.js';
import { InvalidProductNameError } from '@domain/product/errors/invalid-product-name.error.js';
import { InvalidProductPriceError } from '@domain/product/errors/invalid-product-price.error.js';

class MockProductRepository implements IProductRepository {
  saved: Product[] = [];
  async findAll(): Promise<Product[]> { return [...this.saved]; }
  async findById(id: string): Promise<Product | null> { return this.saved.find((p) => p.id === id) ?? null; }
  async save(entity: Product): Promise<void> { this.saved.push(entity); }
  async update(entity: Product): Promise<void> {
    const i = this.saved.findIndex((p) => p.id === entity.id);
    if (i >= 0) this.saved[i] = entity;
  }
  async delete(id: string): Promise<void> { this.saved = this.saved.filter((p) => p.id !== id); }
}

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let repo: MockProductRepository;
  let logger: MockLogger;

  beforeEach(() => {
    repo = new MockProductRepository();
    logger = new MockLogger();
    useCase = new CreateProductUseCase(repo, logger);
  });

  it('creates and saves the product, returning the result', async () => {
    const result = await useCase.execute({ id: 'p-1', name: 'Widget', price: 9.99 });

    expect(result).toEqual({ id: 'p-1', name: 'Widget', price: 9.99 });
    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].id).toBe('p-1');
  });

  it('propagates InvalidProductNameError when name is invalid', async () => {
    await expect(
      useCase.execute({ id: 'p-1', name: '', price: 9.99 }),
    ).rejects.toThrow(InvalidProductNameError);
  });

  it('propagates InvalidProductPriceError when price is invalid', async () => {
    await expect(
      useCase.execute({ id: 'p-1', name: 'Widget', price: -1 }),
    ).rejects.toThrow(InvalidProductPriceError);
  });
});
