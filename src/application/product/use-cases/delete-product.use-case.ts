import { ProductNotFoundError } from '@domain/product/errors/product-not-found.error.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type { DeleteProductCommand } from '@application/product/dto/delete-product.dto.js';

export class DeleteProductUseCase {
  constructor(
    private readonly repo: IProductRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    this.logger.info('Deleting product', { id: command.id });

    const product = await this.repo.findById(command.id);
    if (!product) throw new ProductNotFoundError(command.id);

    await this.repo.delete(command.id);
    this.logger.info('Product deleted', { id: command.id });
  }
}
