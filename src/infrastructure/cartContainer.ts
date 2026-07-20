import { PostgresCartRepository } from './repositories/PostgresCartRepository';
import { PostgresProductRepository } from './repositories/PostgresProductRepository';
import { AddItemToCartUseCase } from '../application/cart/AddItemToCartUseCase';
import { RemoveItemFromCartUseCase } from '../application/cart/RemoveItemFromCartUseCase';
import { UpdateItemQuantityUseCase } from '../application/cart/UpdateItemQuantityUseCase';
import { GetCartUseCase } from '../application/cart/GetCartUseCase';

const cartRepository = new PostgresCartRepository();
const productRepository = new PostgresProductRepository();

export const cartContainer = {
  addItemToCart: new AddItemToCartUseCase(cartRepository, productRepository),
  removeItemFromCart: new RemoveItemFromCartUseCase(cartRepository),
  updateItemQuantity: new UpdateItemQuantityUseCase(cartRepository, productRepository),
  getCart: new GetCartUseCase(cartRepository, productRepository)
};