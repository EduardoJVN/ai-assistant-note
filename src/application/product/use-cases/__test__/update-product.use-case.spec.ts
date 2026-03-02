import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateProductUseCase } from '../update-product.use-case.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import { Product } from '@domain/product/entities/product.entity.js';
import { ProductNotFoundError } from '@domain/product/errors/product-not-found.error.js';
import { InvalidProductNameError } from '@domain/product/errors/invalid-product-name.error.js';
import { InvalidProductPriceError } from '@domain/product/errors/invalid-product-price.error.js';

class MockProductRepository implements IProductRepository {
  products: Product[] = [];
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

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let repo: MockProductRepository;
  let logger: MockLogger;

  beforeEach(() => {
    repo = new MockProductRepository();
    logger = new MockLogger();
    useCase = new UpdateProductUseCase(repo, logger);
  });

  it('updates and returns the product when it exists', async () => {
    repo.seed(Product.reconstitute('p-1', 'Widget', 9.99));

    const result = await useCase.execute({ id: 'p-1', name: 'Gadget', price: 29.99 });

    expect(result).toEqual({ id: 'p-1', name: 'Gadget', price: 29.99 });
    expect(repo.products[0].name).toBe('Gadget');
    expect(repo.products[0].price).toBe(29.99);
  });

  it('throws ProductNotFoundError when product does not exist', async () => {
    await expect(
      useCase.execute({ id: 'nonexistent', name: 'Gadget', price: 29.99 }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it('propagates InvalidProductNameError when new name is invalid', async () => {
    repo.seed(Product.reconstitute('p-1', 'Widget', 9.99));

    await expect(
      useCase.execute({ id: 'p-1', name: '', price: 29.99 }),
    ).rejects.toThrow(InvalidProductNameError);
  });

  it('propagates InvalidProductPriceError when new price is invalid', async () => {
    repo.seed(Product.reconstitute('p-1', 'Widget', 9.99));

    await expect(
      useCase.execute({ id: 'p-1', name: 'Gadget', price: 0 }),
    ).rejects.toThrow(InvalidProductPriceError);
  });
});
