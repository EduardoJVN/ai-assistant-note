import { ProductNotFoundError } from '@domain/product/errors/product-not-found.error.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type {
  GetProductCommand,
  GetProductResult,
} from '@application/product/dto/get-product.dto.js';

export class GetProductUseCase {
  constructor(
    private readonly repo: IProductRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(command: GetProductCommand): Promise<GetProductResult> {
    this.logger.info('Getting product', { id: command.id });

    const product = await this.repo.findById(command.id);
    if (!product) throw new ProductNotFoundError(command.id);

    return { id: product.id, name: product.name, price: product.price };
  }
}
