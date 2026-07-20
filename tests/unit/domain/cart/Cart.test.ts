import { describe, it, expect } from 'vitest';
import { Cart } from '../../../../src/domain/cart/Cart';
import { CartItem } from '../../../../src/domain/cart/CartItem';
import { Product } from '../../../../src/domain/product/Product';
import {
  CartItemNotFoundError,
  InsufficientStockError,
  InvalidCartOperationError
} from '../../../../src/domain/cart/errors';

function makeProduct(overrides: Partial<{ name: string; price: number; stock: number }> = {}) {
  return Product.create({
    name: overrides.name ?? 'Widget',
    price: overrides.price ?? 10,
    stock: overrides.stock ?? 5
  });
}

describe('CartItem', () => {
  it('creates a valid item and computes subtotal', () => {
    const item = CartItem.create({ productId: 'p1', quantity: 3, unitPrice: 9.99 });
    expect(item.subtotal).toBeCloseTo(29.97, 2);
  });

  it('rejects zero or negative quantity', () => {
    expect(() => CartItem.create({ productId: 'p1', quantity: 0, unitPrice: 1 })).toThrow(
      InvalidCartOperationError
    );
    expect(() => CartItem.create({ productId: 'p1', quantity: -2, unitPrice: 1 })).toThrow(
      InvalidCartOperationError
    );
  });

  it('rejects a non-positive unit price', () => {
    expect(() => CartItem.create({ productId: 'p1', quantity: 1, unitPrice: 0 })).toThrow(
      InvalidCartOperationError
    );
  });

  it('rejects a missing product id', () => {
    expect(() => CartItem.create({ productId: '', quantity: 1, unitPrice: 1 })).toThrow(
      InvalidCartOperationError
    );
  });

  it('withQuantity returns a new immutable instance', () => {
    const item = CartItem.create({ productId: 'p1', quantity: 1, unitPrice: 5 });
    const updated = item.withQuantity(4);
    expect(item.quantity).toBe(1);
    expect(updated.quantity).toBe(4);
  });
});

describe('Cart', () => {
  it('starts empty', () => {
    const cart = Cart.createEmpty('cart-1');
    expect(cart.items).toHaveLength(0);
    expect(cart.totalItemCount).toBe(0);
    expect(cart.totalPrice).toBe(0);
  });

  it('adds a new item', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct({ price: 10, stock: 5 });
    cart.addItem(product, 2);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.totalItemCount).toBe(2);
    expect(cart.totalPrice).toBe(20);
  });

  it('combines quantities when adding the same product twice', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct({ price: 10, stock: 5 });
    cart.addItem(product, 2);
    cart.addItem(product, 1);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it('rejects adding a quantity that would exceed stock', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct({ price: 10, stock: 3 });
    expect(() => cart.addItem(product, 4)).toThrow(InsufficientStockError);
  });

  it('rejects adding a combined quantity that would exceed stock', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct({ price: 10, stock: 3 });
    cart.addItem(product, 2);
    expect(() => cart.addItem(product, 2)).toThrow(InsufficientStockError);
  });

  it('rejects adding a non-positive quantity', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct();
    expect(() => cart.addItem(product, 0)).toThrow(InvalidCartOperationError);
    expect(() => cart.addItem(product, -1)).toThrow(InvalidCartOperationError);
  });

  it('removes an existing item', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct();
    cart.addItem(product, 1);
    cart.removeItem(product.id);
    expect(cart.items).toHaveLength(0);
  });

  it('throws when removing an item that does not exist', () => {
    const cart = Cart.createEmpty('cart-1');
    expect(() => cart.removeItem('nonexistent')).toThrow(CartItemNotFoundError);
  });

  it('updates the quantity of an existing item', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct({ stock: 10 });
    cart.addItem(product, 2);
    cart.updateItemQuantity(product.id, 5, product);
    expect(cart.items[0].quantity).toBe(5);
  });

  it('rejects updating quantity beyond available stock', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct({ stock: 3 });
    cart.addItem(product, 2);
    expect(() => cart.updateItemQuantity(product.id, 10, product)).toThrow(InsufficientStockError);
  });

  it('rejects updating quantity for an item not in the cart', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct();
    expect(() => cart.updateItemQuantity(product.id, 2, product)).toThrow(CartItemNotFoundError);
  });

  it('rejects a non-positive updated quantity', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct({ stock: 10 });
    cart.addItem(product, 2);
    expect(() => cart.updateItemQuantity(product.id, 0, product)).toThrow(InvalidCartOperationError);
  });

  it('computes total price across multiple line items', () => {
    const cart = Cart.createEmpty('cart-1');
    const p1 = makeProduct({ price: 10, stock: 5 });
    const p2 = makeProduct({ price: 7.5, stock: 5 });
    cart.addItem(p1, 2); // 20
    cart.addItem(p2, 2); // 15
    expect(cart.totalPrice).toBe(35);
    expect(cart.totalItemCount).toBe(4);
  });

  it('snapshots the unit price at add-time, unaffected by later product price changes', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct({ price: 10, stock: 5 });
    cart.addItem(product, 1);
    product.update({ price: 999 });
    expect(cart.items[0].unitPrice).toBe(10);
  });

  it('reconstitutes from a snapshot without sharing array references', () => {
    const cart = Cart.createEmpty('cart-1');
    const product = makeProduct();
    cart.addItem(product, 1);
    const snapshot = cart.toSnapshot();
    const rebuilt = Cart.reconstitute(snapshot);

    rebuilt.removeItem(product.id);
    expect(cart.items).toHaveLength(1); // original untouched
    expect(rebuilt.items).toHaveLength(0);
  });
});
