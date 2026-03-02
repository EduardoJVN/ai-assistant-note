import { InvalidProductNameError } from '@domain/product/errors/invalid-product-name.error.js';
import { InvalidProductPriceError } from '@domain/product/errors/invalid-product-price.error.js';

export class Product {
  private constructor(
    public readonly id: string,
    public name: string,
    public price: number,
  ) {}

  static create(id: string, name: string, price: number): Product {
    if (!name || name.trim().length === 0) throw new InvalidProductNameError();
    if (price <= 0) throw new InvalidProductPriceError(price);
    return new Product(id, name.trim(), price);
  }

  static reconstitute(id: string, name: string, price: number): Product {
    return new Product(id, name, price);
  }

  update(name: string, price: number): void {
    if (!name || name.trim().length === 0) throw new InvalidProductNameError();
    if (price <= 0) throw new InvalidProductPriceError(price);
    this.name = name.trim();
    this.price = price;
  }
}
