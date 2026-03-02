export interface ListProductsResult {
  products: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}
