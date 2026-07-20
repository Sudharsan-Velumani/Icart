import { describe, it, expect, beforeEach } from 'vitest';
import type { Product } from '../../../../src/domain/product/Product';
import type { ProductRepository } from '../../../../src/domain/product/ProductRepository';
import type { Cart } from '../../../../src/domain/cart/Cart';
import type { CartRepository } from '../../../../src/domain/cart/CartRepository';
import { AddProductUseCase } from '../../../../src/application/product/AddProductUseCase';
import { AddItemToCartUseCase } from '../../../../src/application/cart/AddItemToCartUseCase';
import { RemoveItemFromCartUseCase } from '../../../../src/application/cart/RemoveItemFromCartUseCase';
import { UpdateItemQuantityUseCase } from '../../../../src/application/cart/UpdateItemQuantityUseCase';
import { GetCartUseCase } from '../../../../src/application/cart/GetCartUseCase';
import { ProductNotFoundError } from '../../../../src/domain/product/errors';
import { CartItemNotFoundError, InsufficientStockError } from '../../../../src/domain/cart/errors';

class InMemoryProductRepository implements ProductRepository {
  private readonly store = new Map<string, Product>();
  async save(product: Product): Promise<void> {
    this.store.set(product.id, product);
  }
  async findById(id: string): Promise<Product | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<Product[]> {
    return Array.from(this.store.values());
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
  async existsById(id: string): Promise<boolean> {
    return this.store.has(id);
  }
}

class InMemoryCartRepository implements CartRepository {
  private readonly store = new Map<string, Cart>();
  async save(cart: Cart): Promise<void> {
    this.store.set(cart.id, cart);
  }
  async findById(id: string): Promise<Cart | null> {
    return this.store.get(id) ?? null;
  }
}

describe('Cart use cases', () => {
  let productRepository: InMemoryProductRepository;
  let cartRepository: InMemoryCartRepository;
  let addProduct: AddProductUseCase;
  let addItemToCart: AddItemToCartUseCase;
  let removeItemFromCart: RemoveItemFromCartUseCase;
  let updateItemQuantity: UpdateItemQuantityUseCase;
  let getCart: GetCartUseCase;

  beforeEach(() => {
    productRepository = new InMemoryProductRepository();
    cartRepository = new InMemoryCartRepository();
    addProduct = new AddProductUseCase(productRepository);
    addItemToCart = new AddItemToCartUseCase(cartRepository, productRepository);
    removeItemFromCart = new RemoveItemFromCartUseCase(cartRepository);
    updateItemQuantity = new UpdateItemQuantityUseCase(cartRepository, productRepository);
    getCart = new GetCartUseCase(cartRepository, productRepository);
  });

  describe('AddItemToCartUseCase', () => {
    it('adds an item to a new cart', async () => {
      const product = await addProduct.execute({ name: 'Ball', price: 5, stock: 10 });
      await addItemToCart.execute({ userId: 'user-1', productId: product.id, quantity: 2 });

      const view = await getCart.execute('user-1');
      expect(view.items).toHaveLength(1);
      expect(view.items[0].quantity).toBe(2);
      expect(view.totalPrice).toBe(10);
    });

    it('throws when adding a non-existent product', async () => {
      await expect(
        addItemToCart.execute({ userId: 'user-1', productId: 'missing', quantity: 1 })
      ).rejects.toThrow(ProductNotFoundError);
    });

    it('throws when requested quantity exceeds stock', async () => {
      const product = await addProduct.execute({ name: 'Ball', price: 5, stock: 2 });
      await expect(
        addItemToCart.execute({ userId: 'user-1', productId: product.id, quantity: 5 })
      ).rejects.toThrow(InsufficientStockError);
    });

    it('keeps separate carts isolated per user', async () => {
      const product = await addProduct.execute({ name: 'Ball', price: 5, stock: 10 });
      await addItemToCart.execute({ userId: 'user-1', productId: product.id, quantity: 1 });

      const otherUsersCart = await getCart.execute('user-2');
      expect(otherUsersCart.items).toHaveLength(0);
    });
  });

  describe('RemoveItemFromCartUseCase', () => {
    it('removes an item from the cart', async () => {
      const product = await addProduct.execute({ name: 'Ball', price: 5, stock: 10 });
      await addItemToCart.execute({ userId: 'user-1', productId: product.id, quantity: 1 });
      await removeItemFromCart.execute({ userId: 'user-1', productId: product.id });

      const view = await getCart.execute('user-1');
      expect(view.items).toHaveLength(0);
    });

    it('throws when removing from a cart that does not exist', async () => {
      await expect(
        removeItemFromCart.execute({ userId: 'never-shopped', productId: 'p1' })
      ).rejects.toThrow(CartItemNotFoundError);
    });
  });

  describe('UpdateItemQuantityUseCase', () => {
    it('updates item quantity', async () => {
      const product = await addProduct.execute({ name: 'Ball', price: 5, stock: 10 });
      await addItemToCart.execute({ userId: 'user-1', productId: product.id, quantity: 1 });
      await updateItemQuantity.execute({ userId: 'user-1', productId: product.id, quantity: 4 });

      const view = await getCart.execute('user-1');
      expect(view.items[0].quantity).toBe(4);
    });

    it('throws when updating quantity beyond stock', async () => {
      const product = await addProduct.execute({ name: 'Ball', price: 5, stock: 3 });
      await addItemToCart.execute({ userId: 'user-1', productId: product.id, quantity: 1 });
      await expect(
        updateItemQuantity.execute({ userId: 'user-1', productId: product.id, quantity: 10 })
      ).rejects.toThrow(InsufficientStockError);
    });
  });

  describe('GetCartUseCase', () => {
    it('returns an empty view for a cart that was never created', async () => {
      const view = await getCart.execute('never-shopped');
      expect(view.items).toHaveLength(0);
      expect(view.totalPrice).toBe(0);
    });

    it('enriches cart items with product name from the catalog', async () => {
      const product = await addProduct.execute({ name: 'Ball', price: 5, stock: 10 });
      await addItemToCart.execute({ userId: 'user-1', productId: product.id, quantity: 1 });
      const view = await getCart.execute('user-1');
      expect(view.items[0].productName).toBe('Ball');
    });
  });
});
