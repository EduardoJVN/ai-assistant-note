import { Product } from '@domain/product/entities/product.entity.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';

export class InMemoryProductAdapter implements IProductRepository {
  private readonly store: Map<string, Product> = new Map();

  async findAll(): Promise<Product[]> {
    return Array.from(this.store.values());
  }

  async findById(id: string): Promise<Product | null> {
    return this.store.get(id) ?? null;
  }

  async save(entity: Product): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async update(entity: Product): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
