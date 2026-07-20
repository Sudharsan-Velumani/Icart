import { Product } from '../../domain/product/Product';
import type { ProductRepository } from '../../domain/product/ProductRepository';

export interface AddProductCommand {
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

export class AddProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(command: AddProductCommand): Promise<Product> {
    const product = Product.create(command);
    await this.productRepository.save(product);
    return product;
  }
}