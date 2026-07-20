import { Cart } from '../../domain/cart/Cart';
import type { CartRepository } from '../../domain/cart/CartRepository';
import type { ProductRepository } from '../../domain/product/ProductRepository';

export interface CartLineDTO {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CartViewDTO {
  id: string;
  items: CartLineDTO[];
  totalItemCount: number;
  totalPrice: number;
  updatedAt: string;
}

export class GetCartUseCase {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async execute(userId: string): Promise<CartViewDTO> {
    const cart = (await this.cartRepository.findById(userId)) ?? Cart.createEmpty(userId);

    const items: CartLineDTO[] = [];
    for (const item of cart.items) {
      const product = await this.productRepository.findById(item.productId);
      items.push({
        productId: item.productId,
        productName: product?.name ?? '(product no longer available)',
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal
      });
    }

    return {
      id: cart.id,
      items,
      totalItemCount: cart.totalItemCount,
      totalPrice: cart.totalPrice,
      updatedAt: cart.updatedAt.toISOString()
    };
  }
}