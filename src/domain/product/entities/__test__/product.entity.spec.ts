import { describe, it, expect } from 'vitest';
import { Product } from '@domain/product/entities/product.entity.js';
import { InvalidProductNameError } from '@domain/product/errors/invalid-product-name.error.js';
import { InvalidProductPriceError } from '@domain/product/errors/invalid-product-price.error.js';

describe('Product', () => {
  describe('create', () => {
    it('creates a product with valid data', () => {
      const product = Product.create('id-1', 'Widget', 9.99);

      expect(product.id).toBe('id-1');
      expect(product.name).toBe('Widget');
      expect(product.price).toBe(9.99);
    });

    it('trims the name', () => {
      const product = Product.create('id-1', '  Widget  ', 9.99);

      expect(product.name).toBe('Widget');
    });

    it('throws InvalidProductNameError for empty name', () => {
      expect(() => Product.create('id-1', '', 9.99)).toThrow(InvalidProductNameError);
    });

    it('throws InvalidProductNameError for whitespace-only name', () => {
      expect(() => Product.create('id-1', '   ', 9.99)).toThrow(InvalidProductNameError);
    });

    it('throws InvalidProductPriceError for zero price', () => {
      expect(() => Product.create('id-1', 'Widget', 0)).toThrow(InvalidProductPriceError);
    });

    it('throws InvalidProductPriceError for negative price', () => {
      expect(() => Product.create('id-1', 'Widget', -5)).toThrow(InvalidProductPriceError);
    });
  });

  describe('reconstitute', () => {
    it('rebuilds a product from persistence without validation', () => {
      const product = Product.reconstitute('id-1', 'Widget', 9.99);

      expect(product.id).toBe('id-1');
      expect(product.name).toBe('Widget');
      expect(product.price).toBe(9.99);
    });
  });

  describe('update', () => {
    it('updates name and price', () => {
      const product = Product.create('id-1', 'Widget', 9.99);

      product.update('Gadget', 29.99);

      expect(product.name).toBe('Gadget');
      expect(product.price).toBe(29.99);
    });

    it('trims the name on update', () => {
      const product = Product.create('id-1', 'Widget', 9.99);

      product.update('  Gadget  ', 29.99);

      expect(product.name).toBe('Gadget');
    });

    it('throws InvalidProductNameError for empty name on update', () => {
      const product = Product.create('id-1', 'Widget', 9.99);

      expect(() => product.update('', 29.99)).toThrow(InvalidProductNameError);
    });

    it('throws InvalidProductPriceError for zero price on update', () => {
      const product = Product.create('id-1', 'Widget', 9.99);

      expect(() => product.update('Gadget', 0)).toThrow(InvalidProductPriceError);
    });

    it('throws InvalidProductPriceError for negative price on update', () => {
      const product = Product.create('id-1', 'Widget', 9.99);

      expect(() => product.update('Gadget', -1)).toThrow(InvalidProductPriceError);
    });
  });
});
