import type { ILogger } from '@domain/ports/logger.port.js';
import type { IErrorReporter } from '@domain/ports/error-reporter.port.js';
import { InMemoryProductAdapter } from '@infra/adapters/in-memory-product.adapter.js';
import { ProductController } from '@infra/entry-points/product.controller.js';
import { CreateProductUseCase } from '@application/product/use-cases/create-product.use-case.js';
import { GetProductUseCase } from '@application/product/use-cases/get-product.use-case.js';
import { ListProductsUseCase } from '@application/product/use-cases/list-products.use-case.js';
import { UpdateProductUseCase } from '@application/product/use-cases/update-product.use-case.js';
import { DeleteProductUseCase } from '@application/product/use-cases/delete-product.use-case.js';

export function createProductModule(logger: ILogger, errorReporter: IErrorReporter): ProductController {
  const repo = new InMemoryProductAdapter();

  return new ProductController(
    errorReporter,
    new CreateProductUseCase(repo, logger),
    new GetProductUseCase(repo, logger),
    new ListProductsUseCase(repo, logger),
    new UpdateProductUseCase(repo, logger),
    new DeleteProductUseCase(repo, logger),
  );
}
