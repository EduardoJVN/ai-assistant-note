import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListProductsUseCase } from '../list-products.use-case.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import { Product } from '@domain/product/entities/product.entity.js';

class MockProductRepository implements IProductRepository {
  private products: Product[] = [];
  async findAll(): Promise<Product[]> { return [...this.products]; }
  async findById(id: string): Promise<Product | null> { return this.products.find((p) => p.id === id) ?? null; }
  async save(entity: Product): Promise<void> { this.products.push(entity); }
  async update(entity: Product): Promise<void> {
    const i = this.products.findIndex((p) => p.id === entity.id);
    if (i >= 0) this.products[i] = entity;
  }
  async delete(id: string): Promise<void> { this.products = this.products.filter((p) => p.id !== id); }
  seed(product: Product): void { this.products.push(product); }
}

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}

describe('ListProductsUseCase', () => {
  let useCase: ListProductsUseCase;
  let repo: MockProductRepository;
  let logger: MockLogger;

  beforeEach(() => {
    repo = new MockProductRepository();
    logger = new MockLogger();
    useCase = new ListProductsUseCase(repo, logger);
  });

  it('returns an empty list when no products exist', async () => {
    const result = await useCase.execute();

    expect(result.products).toHaveLength(0);
  });

  it('returns all products mapped to result shape', async () => {
    repo.seed(Product.reconstitute('p-1', 'Widget', 9.99));
    repo.seed(Product.reconstitute('p-2', 'Gadget', 19.99));

    const result = await useCase.execute();

    expect(result.products).toHaveLength(2);
    expect(result.products[0]).toEqual({ id: 'p-1', name: 'Widget', price: 9.99 });
    expect(result.products[1]).toEqual({ id: 'p-2', name: 'Gadget', price: 19.99 });
  });
});
