import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type { ListProductsResult } from '@application/product/dto/list-products.dto.js';

export class ListProductsUseCase {
  constructor(
    private readonly repo: IProductRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(): Promise<ListProductsResult> {
    this.logger.info('Listing all products');

    const products = await this.repo.findAll();
    return {
      products: products.map((p) => ({ id: p.id, name: p.name, price: p.price })),
    };
  }
}
