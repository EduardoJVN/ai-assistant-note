import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductController } from '../product.controller.js';
import { ProductNotFoundError } from '@domain/product/errors/product-not-found.error.js';
import { InvalidProductNameError } from '@domain/product/errors/invalid-product-name.error.js';
import type { CreateProductUseCase } from '@application/product/use-cases/create-product.use-case.js';
import type { GetProductUseCase } from '@application/product/use-cases/get-product.use-case.js';
import type { ListProductsUseCase } from '@application/product/use-cases/list-products.use-case.js';
import type { UpdateProductUseCase } from '@application/product/use-cases/update-product.use-case.js';
import type { DeleteProductUseCase } from '@application/product/use-cases/delete-product.use-case.js';

const mockCreate = { execute: vi.fn() };
const mockGet = { execute: vi.fn() };
const mockList = { execute: vi.fn() };
const mockUpdate = { execute: vi.fn() };
const mockDelete = { execute: vi.fn() };

describe('ProductController', () => {
  let controller: ProductController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ProductController(
      mockCreate as unknown as CreateProductUseCase,
      mockGet as unknown as GetProductUseCase,
      mockList as unknown as ListProductsUseCase,
      mockUpdate as unknown as UpdateProductUseCase,
      mockDelete as unknown as DeleteProductUseCase,
    );
  });

  describe('create', () => {
    it('returns 201 with the created product on success', async () => {
      const product = { id: 'p-1', name: 'Widget', price: 9.99 };
      mockCreate.execute.mockResolvedValue(product);

      const response = await controller.create({ body: { id: 'p-1', name: 'Widget', price: 9.99 } });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(product);
    });

    it('returns 400 without calling use case when body fails Zod validation', async () => {
      const response = await controller.create({ body: { name: 'Widget' } });

      expect(response.status).toBe(400);
      expect(mockCreate.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when use case throws a DomainError', async () => {
      mockCreate.execute.mockRejectedValue(new InvalidProductNameError());

      const response = await controller.create({ body: { id: 'p-1', name: 'Widget', price: 9.99 } });

      expect(response.status).toBe(400);
    });
  });

  describe('getById', () => {
    it('returns 200 with the product when found', async () => {
      const product = { id: 'p-1', name: 'Widget', price: 9.99 };
      mockGet.execute.mockResolvedValue(product);

      const response = await controller.getById({ params: { id: 'p-1' } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(product);
    });

    it('returns 404 when product is not found', async () => {
      mockGet.execute.mockRejectedValue(new ProductNotFoundError('p-1'));

      const response = await controller.getById({ params: { id: 'p-1' } });

      expect(response.status).toBe(404);
    });

    it('uses empty string id when params is not provided', async () => {
      mockGet.execute.mockRejectedValue(new ProductNotFoundError(''));

      const response = await controller.getById({});

      expect(mockGet.execute).toHaveBeenCalledWith({ id: '' });
      expect(response.status).toBe(404);
    });
  });

  describe('list', () => {
    it('returns 200 with all products', async () => {
      const result = { products: [{ id: 'p-1', name: 'Widget', price: 9.99 }] };
      mockList.execute.mockResolvedValue(result);

      const response = await controller.list({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
    });

    it('returns 500 when use case throws an unexpected error', async () => {
      mockList.execute.mockRejectedValue(new Error('DB connection lost'));

      const response = await controller.list({});

      expect(response.status).toBe(500);
    });
  });

  describe('update', () => {
    it('returns 200 with the updated product on success', async () => {
      const product = { id: 'p-1', name: 'Gadget', price: 29.99 };
      mockUpdate.execute.mockResolvedValue(product);

      const response = await controller.update({
        params: { id: 'p-1' },
        body: { name: 'Gadget', price: 29.99 },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(product);
    });

    it('returns 400 without calling use case when body fails Zod validation', async () => {
      const response = await controller.update({ params: { id: 'p-1' }, body: {} });

      expect(response.status).toBe(400);
      expect(mockUpdate.execute).not.toHaveBeenCalled();
    });

    it('returns 404 when product is not found', async () => {
      mockUpdate.execute.mockRejectedValue(new ProductNotFoundError('p-1'));

      const response = await controller.update({
        params: { id: 'p-1' },
        body: { name: 'Gadget', price: 29.99 },
      });

      expect(response.status).toBe(404);
    });

    it('uses empty string id when params is not provided', async () => {
      mockUpdate.execute.mockRejectedValue(new ProductNotFoundError(''));

      const response = await controller.update({ body: { name: 'Gadget', price: 29.99 } });

      expect(mockUpdate.execute).toHaveBeenCalledWith({ id: '', name: 'Gadget', price: 29.99 });
      expect(response.status).toBe(404);
    });
  });

  describe('delete', () => {
    it('returns 204 on success', async () => {
      mockDelete.execute.mockResolvedValue(undefined);

      const response = await controller.delete({ params: { id: 'p-1' } });

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it('returns 404 when product is not found', async () => {
      mockDelete.execute.mockRejectedValue(new ProductNotFoundError('p-1'));

      const response = await controller.delete({ params: { id: 'p-1' } });

      expect(response.status).toBe(404);
    });

    it('uses empty string id when params is not provided', async () => {
      mockDelete.execute.mockRejectedValue(new ProductNotFoundError(''));

      const response = await controller.delete({});

      expect(mockDelete.execute).toHaveBeenCalledWith({ id: '' });
      expect(response.status).toBe(404);
    });
  });
});
