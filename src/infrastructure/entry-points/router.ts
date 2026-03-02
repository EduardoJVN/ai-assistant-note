import { Router } from 'express';
import type { ProductController } from '@infra/entry-points/product.controller.js';
import { createProductRouter } from '@infra/entry-points/product.routes.js';

export interface AppControllers {
  product: ProductController;
}

export function registerRoutes(controllers: AppControllers): Router {
  const router = Router();

  router.use('/products', createProductRouter(controllers.product));

  return router;
}
