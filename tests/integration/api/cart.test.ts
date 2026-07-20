import { describe, it, expect, vi } from 'vitest';
import { makeContext } from '../testContext';

/**
 * Replace both the Postgres-backed product and cart containers with
 * in-memory-backed equivalents built from the real use case classes,
 * so we can integration-test the actual API routes without a database.
 */
vi.mock('../../../src/infrastructure/productContainer', async () => {
  const { AddProductUseCase } = await import('../../../src/application/product/AddProductUseCase');
  const { GetProductUseCase, ListProductsUseCase } = await import(
    '../../../src/application/product/GetProductUseCase'
  );
  const { UpdateProductUseCase } = await import('../../../src/application/product/UpdateProductUseCase');
  const { DeleteProductUseCase } = await import('../../../src/application/product/DeleteProductUseCase');

  const store = new Map<string, any>();
  const repo = {
    async save(product: any) {
      store.set(product.id, product);
    },
    async findById(id: string) {
      return store.get(id) ?? null;
    },
    async findAll() {
      return Array.from(store.values());
    },
    async delete(id: string) {
      store.delete(id);
    },
    async existsById(id: string) {
      return store.has(id);
    }
  };

  return {
    productContainer: {
      addProduct: new AddProductUseCase(repo as any),
      updateProduct: new UpdateProductUseCase(repo as any),
      deleteProduct: new DeleteProductUseCase(repo as any),
      getProduct: new GetProductUseCase(repo as any),
      listProducts: new ListProductsUseCase(repo as any)
    },
    __productRepo: repo
  };
});

vi.mock('../../../src/infrastructure/cartContainer', async () => {
  const { AddItemToCartUseCase } = await import('../../../src/application/cart/AddItemToCartUseCase');
  const { RemoveItemFromCartUseCase } = await import('../../../src/application/cart/RemoveItemFromCartUseCase');
  const { UpdateItemQuantityUseCase } = await import('../../../src/application/cart/UpdateItemQuantityUseCase');
  const { GetCartUseCase } = await import('../../../src/application/cart/GetCartUseCase');
  const productContainerModule = await import('../../../src/infrastructure/productContainer');
  const productRepo = (productContainerModule as any).__productRepo;

  const cartStore = new Map<string, any>();
  const cartRepo = {
    async save(cart: any) {
      cartStore.set(cart.id, cart);
    },
    async findById(id: string) {
      return cartStore.get(id) ?? null;
    }
  };

  return {
    cartContainer: {
      addItemToCart: new AddItemToCartUseCase(cartRepo as any, productRepo),
      removeItemFromCart: new RemoveItemFromCartUseCase(cartRepo as any),
      updateItemQuantity: new UpdateItemQuantityUseCase(cartRepo as any, productRepo),
      getCart: new GetCartUseCase(cartRepo as any, productRepo)
    }
  };
});

const { POST: createProduct } = await import('../../../src/pages/api/products/index');
const { GET: getCart } = await import('../../../src/pages/api/cart/index');
const { POST: addItem } = await import('../../../src/pages/api/cart/items');
const {
  PUT: updateItemQuantity,
  DELETE: removeItem
} = await import('../../../src/pages/api/cart/items/[productId]');

const ADMIN_SESSION = { adminId: 'admin-1', adminEmail: 'admin@icart.com' };
const USER_SESSION = { userId: 'user-1', userEmail: 'jane@icart.com', userName: 'Jane' };

async function seedProduct(overrides: Partial<{ name: string; price: number; stock: number }> = {}) {
  const res = await createProduct(
    makeContext({
      url: 'http://localhost/api/products',
      method: 'POST',
      body: {
        name: overrides.name ?? 'Test Product',
        price: overrides.price ?? 10,
        stock: overrides.stock ?? 5
      },
      session: ADMIN_SESSION
    })
  );
  return res.json();
}

describe('Cart API integration', () => {
  it('GET /api/cart requires a logged-in user (401 without a session)', async () => {
    const res = await getCart(makeContext({ url: 'http://localhost/api/cart' }));
    expect(res.status).toBe(401);
  });

  it('GET /api/cart returns an empty cart for a new user', async () => {
    const res = await getCart(
      makeContext({ url: 'http://localhost/api/cart', session: { userId: 'brand-new-user' } })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.totalPrice).toBe(0);
  });

  it('POST /api/cart/items requires a logged-in user (401 without a session)', async () => {
    const product = await seedProduct();
    const res = await addItem(
      makeContext({
        url: 'http://localhost/api/cart/items',
        method: 'POST',
        body: { productId: product.id, quantity: 1 }
      })
    );
    expect(res.status).toBe(401);
  });

  it('POST /api/cart/items adds an item to the cart', async () => {
    const product = await seedProduct({ price: 20, stock: 5, name: 'Widget A' });

    const res = await addItem(
      makeContext({
        url: 'http://localhost/api/cart/items',
        method: 'POST',
        body: { productId: product.id, quantity: 2 },
        session: USER_SESSION
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.items.some((i: any) => i.productId === product.id && i.quantity === 2)).toBe(true);
  });

  it('POST /api/cart/items returns 404 for a non-existent product', async () => {
    const res = await addItem(
      makeContext({
        url: 'http://localhost/api/cart/items',
        method: 'POST',
        body: { productId: 'missing-product', quantity: 1 },
        session: USER_SESSION
      })
    );
    expect(res.status).toBe(404);
  });

  it('POST /api/cart/items returns 409 when quantity exceeds stock', async () => {
    const product = await seedProduct({ stock: 2, name: 'Widget B' });
    const res = await addItem(
      makeContext({
        url: 'http://localhost/api/cart/items',
        method: 'POST',
        body: { productId: product.id, quantity: 5 },
        session: USER_SESSION
      })
    );
    expect(res.status).toBe(409);
  });

  it('PUT /api/cart/items/:productId updates quantity', async () => {
    const product = await seedProduct({ stock: 10, name: 'Widget C' });
    await addItem(
      makeContext({
        url: 'http://localhost/api/cart/items',
        method: 'POST',
        body: { productId: product.id, quantity: 1 },
        session: USER_SESSION
      })
    );

    const res = await updateItemQuantity(
      makeContext({
        url: `http://localhost/api/cart/items/${product.id}`,
        method: 'PUT',
        params: { productId: product.id },
        body: { quantity: 4 },
        session: USER_SESSION
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const line = body.items.find((i: any) => i.productId === product.id);
    expect(line.quantity).toBe(4);
  });

  it('DELETE /api/cart/items/:productId removes the item', async () => {
    const product = await seedProduct({ stock: 10, name: 'Widget D' });
    await addItem(
      makeContext({
        url: 'http://localhost/api/cart/items',
        method: 'POST',
        body: { productId: product.id, quantity: 1 },
        session: USER_SESSION
      })
    );

    const res = await removeItem(
      makeContext({
        url: `http://localhost/api/cart/items/${product.id}`,
        method: 'DELETE',
        params: { productId: product.id },
        session: USER_SESSION
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.some((i: any) => i.productId === product.id)).toBe(false);
  });

  it('DELETE /api/cart/items/:productId returns 404 when the item is not in the cart', async () => {
    const res = await removeItem(
      makeContext({
        url: 'http://localhost/api/cart/items/never-added',
        method: 'DELETE',
        params: { productId: 'never-added' },
        session: { userId: 'user-with-empty-cart' }
      })
    );
    expect(res.status).toBe(404);
  });

  it("a cart operation never lets one user see another user's cart", async () => {
    const product = await seedProduct({ stock: 10, name: 'Widget E' });
    await addItem(
      makeContext({
        url: 'http://localhost/api/cart/items',
        method: 'POST',
        body: { productId: product.id, quantity: 1 },
        session: { userId: 'user-A' }
      })
    );

    const res = await getCart(makeContext({ url: 'http://localhost/api/cart', session: { userId: 'user-B' } }));
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });
});
