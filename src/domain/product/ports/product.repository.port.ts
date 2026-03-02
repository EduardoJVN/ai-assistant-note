import type { Product } from '../entities/product.entity.js';

export interface IProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  save(entity: Product): Promise<void>;
  update(entity: Product): Promise<void>;
  delete(id: string): Promise<void>;
}
