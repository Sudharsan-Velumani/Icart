import { Cart } from '../../domain/cart/Cart';
import type { CartRepository } from '../../domain/cart/CartRepository';
import { ProductNotFoundError } from '../../domain/product/errors';
import type { ProductRepository } from '../../domain/product/ProductRepository';

export interface AddItemToCartCommand {
  userId: string;
  productId: string;
  quantity: number;
}

export class AddItemToCartUseCase {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async execute(command: AddItemToCartCommand): Promise<Cart> {
    const product = await this.productRepository.findById(command.productId);
    if (!product) {
      throw new ProductNotFoundError(command.productId);
    }

    const cart = (await this.cartRepository.findById(command.userId)) ?? Cart.createEmpty(command.userId);
    cart.addItem(product, command.quantity);
    await this.cartRepository.save(cart);
    return cart;
  }
}