import { Product } from '@domain/product/entities/product.entity.js';
import type { IProductRepository } from '@domain/product/ports/product.repository.port.js';
import type { ILogger } from '@domain/ports/logger.port.js';
import type {
  CreateProductCommand,
  CreateProductResult,
} from '@application/product/dto/create-product.dto.js';

export class CreateProductUseCase {
  constructor(
    private readonly repo: IProductRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(command: CreateProductCommand): Promise<CreateProductResult> {
    this.logger.info('Creating product', { id: command.id, name: command.name });

    const product = Product.create(command.id, command.name, command.price);
    await this.repo.save(product);

    this.logger.info('Product created', { id: product.id });
    return { id: product.id, name: product.name, price: product.price };
  }
}
