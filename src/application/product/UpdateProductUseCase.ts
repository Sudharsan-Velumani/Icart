import type { Product, UpdateProductInput } from '../../domain/product/Product';
import { ProductNotFoundError } from '../../domain/product/errors';
import type { ProductRepository } from '../../domain/product/ProductRepository';

export interface UpdateProductCommand extends UpdateProductInput {
  id: string;
}

export class UpdateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(command: UpdateProductCommand): Promise<Product> {
    const { id, ...changes } = command;
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    product.update(changes);
    await this.productRepository.save(product);
    return product;
  }
}