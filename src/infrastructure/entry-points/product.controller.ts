import { z } from 'zod';
import { BaseController } from './base.controller.js';
import type { HttpRequest, HttpResponse } from './base.controller.js';
import type { CreateProductUseCase } from '@application/product/use-cases/create-product.use-case.js';
import type { GetProductUseCase } from '@application/product/use-cases/get-product.use-case.js';
import type { ListProductsUseCase } from '@application/product/use-cases/list-products.use-case.js';
import type { UpdateProductUseCase } from '@application/product/use-cases/update-product.use-case.js';
import type { DeleteProductUseCase } from '@application/product/use-cases/delete-product.use-case.js';

const CreateProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
});

const UpdateProductBodySchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});

export class ProductController extends BaseController {
  constructor(
    private readonly createUseCase: CreateProductUseCase,
    private readonly getUseCase: GetProductUseCase,
    private readonly listUseCase: ListProductsUseCase,
    private readonly updateUseCase: UpdateProductUseCase,
    private readonly deleteUseCase: DeleteProductUseCase,
  ) {
    super();
  }

  async create(req: HttpRequest): Promise<HttpResponse> {
    const parsed = CreateProductSchema.safeParse(req.body);
    if (!parsed.success) return { status: 400, body: { error: parsed.error.message } };

    return this.handleRequest(
      () => this.createUseCase.execute(parsed.data),
      (result) => ({ status: 201, body: result }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }

  async getById(req: HttpRequest): Promise<HttpResponse> {
    const id = req.params?.id ?? '';
    return this.handleRequest(
      () => this.getUseCase.execute({ id }),
      (result) => ({ status: 200, body: result }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }

  async list(_req: HttpRequest): Promise<HttpResponse> {
    return this.handleRequest(
      () => this.listUseCase.execute(),
      (result) => ({ status: 200, body: result }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }

  async update(req: HttpRequest): Promise<HttpResponse> {
    const id = req.params?.id ?? '';
    const parsed = UpdateProductBodySchema.safeParse(req.body);
    if (!parsed.success) return { status: 400, body: { error: parsed.error.message } };

    return this.handleRequest(
      () => this.updateUseCase.execute({ id, ...parsed.data }),
      (result) => ({ status: 200, body: result }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }

  async delete(req: HttpRequest): Promise<HttpResponse> {
    const id = req.params?.id ?? '';
    return this.handleRequest(
      () => this.deleteUseCase.execute({ id }),
      () => ({ status: 204, body: null }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }
}
