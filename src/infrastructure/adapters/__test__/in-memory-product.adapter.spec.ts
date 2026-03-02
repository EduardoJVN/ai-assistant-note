import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProductAdapter } from '@infra/adapters/in-memory-product.adapter.js';
import { Product } from '@domain/product/entities/product.entity.js';

describe('InMemoryProductAdapter', () => {
  let adapter: InMemoryProductAdapter;

  beforeEach(() => {
    adapter = new InMemoryProductAdapter();
  });

  describe('save and findById', () => {
    it('saves a product and retrieves it by id', async () => {
      const product = Product.reconstitute('p-1', 'Widget', 9.99);
      await adapter.save(product);

      const found = await adapter.findById('p-1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('p-1');
      expect(found!.name).toBe('Widget');
      expect(found!.price).toBe(9.99);
    });

    it('returns null when product does not exist', async () => {
      const found = await adapter.findById('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns empty array when store is empty', async () => {
      const products = await adapter.findAll();
      expect(products).toHaveLength(0);
    });

    it('returns all saved products', async () => {
      await adapter.save(Product.reconstitute('p-1', 'Widget', 9.99));
      await adapter.save(Product.reconstitute('p-2', 'Gadget', 19.99));

      const products = await adapter.findAll();
      expect(products).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('replaces the stored product', async () => {
      await adapter.save(Product.reconstitute('p-1', 'Widget', 9.99));

      const updated = Product.reconstitute('p-1', 'Super Widget', 49.99);
      await adapter.update(updated);

      const found = await adapter.findById('p-1');
      expect(found!.name).toBe('Super Widget');
      expect(found!.price).toBe(49.99);
    });
  });

  describe('delete', () => {
    it('removes the product from the store', async () => {
      await adapter.save(Product.reconstitute('p-1', 'Widget', 9.99));

      await adapter.delete('p-1');

      const found = await adapter.findById('p-1');
      expect(found).toBeNull();
    });

    it('does nothing when the product does not exist', async () => {
      await expect(adapter.delete('nonexistent')).resolves.not.toThrow();
    });
  });
});
