import type { CartRepository } from '../../domain/cart/CartRepository';
import { CartItemNotFoundError } from '../../domain/cart/errors';
import { ProductNotFoundError } from '../../domain/product/errors';
import type { ProductRepository } from '../../domain/product/ProductRepository';

export interface UpdateItemQuantityCommand {
  userId: string;
  productId: string;
  quantity: number;
}

export class UpdateItemQuantityUseCase {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async execute(command: UpdateItemQuantityCommand) {
    const cart = await this.cartRepository.findById(command.userId);
    if (!cart) {
      throw new CartItemNotFoundError(command.productId);
    }
    const product = await this.productRepository.findById(command.productId);
    if (!product) {
      throw new ProductNotFoundError(command.productId);
    }
    cart.updateItemQuantity(command.productId, command.quantity, product);
    await this.cartRepository.save(cart);
    return cart;
  }
}