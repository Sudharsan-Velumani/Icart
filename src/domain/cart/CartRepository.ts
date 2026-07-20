import type { Cart } from './Cart';

export interface CartRepository {
  save(cart: Cart): Promise<void>;
  findById(id: string): Promise<Cart | null>;
}