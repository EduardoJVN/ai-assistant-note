import { ProductNotFoundError } from '@domain/product/errors/product-not-found.error.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type { UpdateProductCommand, UpdateProductResult } from '@application/product/dto/update-product.dto.js';

export class UpdateProductUseCase {
  constructor(
    private readonly repo: IProductRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(command: UpdateProductCommand): Promise<UpdateProductResult> {
    this.logger.info('Updating product', { id: command.id });

    const product = await this.repo.findById(command.id);
    if (!product) throw new ProductNotFoundError(command.id);

    product.update(command.name, command.price);
    await this.repo.update(product);

    this.logger.info('Product updated', { id: product.id });
    return { id: product.id, name: product.name, price: product.price };
  }
}
