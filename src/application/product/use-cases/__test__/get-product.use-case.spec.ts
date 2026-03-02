import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetProductUseCase } from '../get-product.use-case.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import { Product } from '@domain/product/entities/product.entity.js';
import { ProductNotFoundError } from '@domain/product/errors/product-not-found.error.js';

class MockProductRepository implements IProductRepository {
  private products: Product[] = [];
  async findAll(): Promise<Product[]> {
    return [...this.products];
  }
  async findById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) ?? null;
  }
  async save(entity: Product): Promise<void> {
    this.products.push(entity);
  }
  async update(entity: Product): Promise<void> {
    const i = this.products.findIndex((p) => p.id === entity.id);
    if (i >= 0) this.products[i] = entity;
  }
  async delete(id: string): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
  }
  seed(product: Product): void {
    this.products.push(product);
  }
}

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase;
  let repo: MockProductRepository;
  let logger: MockLogger;

  beforeEach(() => {
    repo = new MockProductRepository();
    logger = new MockLogger();
    useCase = new GetProductUseCase(repo, logger);
  });

  it('returns the product when it exists', async () => {
    repo.seed(Product.reconstitute('p-1', 'Widget', 9.99));

    const result = await useCase.execute({ id: 'p-1' });

    expect(result).toEqual({ id: 'p-1', name: 'Widget', price: 9.99 });
  });

  it('throws ProductNotFoundError when product does not exist', async () => {
    await expect(useCase.execute({ id: 'nonexistent' })).rejects.toThrow(ProductNotFoundError);
  });
});
