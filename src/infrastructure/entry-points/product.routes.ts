import { Router } from 'express';
import type { ProductController } from '@infra/entry-points/product.controller.js';
import { toExpressHandler } from '@infra/entry-points/express-adapter.js';

export function createProductRouter(controller: ProductController): Router {
  const router = Router();

  router.post('/', toExpressHandler((req) => controller.create(req)));
  router.get('/', toExpressHandler((req) => controller.list(req)));
  router.get('/:id', toExpressHandler((req) => controller.getById(req)));
  router.put('/:id', toExpressHandler((req) => controller.update(req)));
  router.delete('/:id', toExpressHandler((req) => controller.delete(req)));

  return router;
}
