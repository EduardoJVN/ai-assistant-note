import { reportBootstrap } from '@infra/config/bootstrap-reporter.js';
import { Logger } from '@infra/adapters/pino-logger.adapter';
import { InMemoryProductAdapter } from '@infra/adapters/in-memory-product.adapter.js';
import { ProductController } from '@infra/entry-points/product.controller.js';
import { CreateProductUseCase } from '@application/product/use-cases/create-product.use-case.js';
import { GetProductUseCase } from '@application/product/use-cases/get-product.use-case.js';
import { ListProductsUseCase } from '@application/product/use-cases/list-products.use-case.js';
import { UpdateProductUseCase } from '@application/product/use-cases/update-product.use-case.js';
import { DeleteProductUseCase } from '@application/product/use-cases/delete-product.use-case.js';

async function bootstrap() {
  const logger = new Logger();
  reportBootstrap(logger);

  // --- Product module ---
  const productRepo = new InMemoryProductAdapter();

  const productController = new ProductController(
    new CreateProductUseCase(productRepo, logger),
    new GetProductUseCase(productRepo, logger),
    new ListProductsUseCase(productRepo, logger),
    new UpdateProductUseCase(productRepo, logger),
    new DeleteProductUseCase(productRepo, logger),
  );

  // Demo CRUD
  logger.info('--- CREATE ---');
  await productController.create({ body: { id: 'p-1', name: 'Widget', price: 9.99 } });
  await productController.create({ body: { id: 'p-2', name: 'Gadget', price: 49.99 } });

  logger.info('--- LIST ---');
  const list = await productController.list({});
  logger.info('Products', { body: list.body });

  logger.info('--- GET BY ID ---');
  const found = await productController.getById({ params: { id: 'p-1' } });
  logger.info('Found', { body: found.body });

  logger.info('--- UPDATE ---');
  await productController.update({ params: { id: 'p-1' }, body: { name: 'Super Widget', price: 19.99 } });
  const updated = await productController.getById({ params: { id: 'p-1' } });
  logger.info('Updated', { body: updated.body });

  logger.info('--- DELETE ---');
  await productController.delete({ params: { id: 'p-2' } });
  const afterDelete = await productController.list({});
  logger.info('After delete', { body: afterDelete.body });

  logger.info('--- NOT FOUND (404 demo) ---');
  const notFound = await productController.getById({ params: { id: 'nonexistent' } });
  logger.info('Not found response', { status: notFound.status, body: notFound.body });
}

bootstrap();
