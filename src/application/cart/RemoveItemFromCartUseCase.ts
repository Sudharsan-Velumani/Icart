import type { CartRepository } from '../../domain/cart/CartRepository';
import { CartItemNotFoundError } from '../../domain/cart/errors';

export interface RemoveItemFromCartCommand {
  userId: string;
  productId: string;
}

export class RemoveItemFromCartUseCase {
  constructor(private readonly cartRepository: CartRepository) {}

  async execute(command: RemoveItemFromCartCommand) {
    const cart = await this.cartRepository.findById(command.userId);
    if (!cart) {
      throw new CartItemNotFoundError(command.productId);
    }
    cart.removeItem(command.productId);
    await this.cartRepository.save(cart);
    return cart;
  }
}