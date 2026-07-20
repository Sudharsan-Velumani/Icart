import { ProductNotFoundError } from '../../domain/product/errors';
import type { ProductRepository } from '../../domain/product/ProductRepository';

export class DeleteProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<void> {
    const exists = await this.productRepository.existsById(id);
    if (!exists) {
      throw new ProductNotFoundError(id);
    }
    await this.productRepository.delete(id);
  }
}