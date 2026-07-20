import { describe, it, expect, vi } from 'vitest';
import { makeContext } from '../testContext';

/**
 * Replace the real (Postgres-backed) product container with one wired to an
 * in-memory repository. This lets us integration-test the actual route
 * handlers -- request in, JSON response out -- without a real database.
 * The use cases and domain code exercised here are the exact production code.
 */
vi.mock('../../../src/infrastructure/productContainer', async () => {
  const { AddProductUseCase } = await import('../../../src/application/product/AddProductUseCase');
  const { UpdateProductUseCase } = await import('../../../src/application/product/UpdateProductUseCase');
  const { DeleteProductUseCase } = await import('../../../src/application/product/DeleteProductUseCase');
  const { GetProductUseCase, ListProductsUseCase } = await import(
    '../../../src/application/product/GetProductUseCase'
  );

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
    }
  };
});

const { GET: listProducts, POST: createProduct } = await import('../../../src/pages/api/products/index');
const {
  GET: getProduct,
  PUT: updateProduct,
  DELETE: deleteProduct
} = await import('../../../src/pages/api/products/[id]');

const ADMIN_SESSION = { adminId: 'admin-1', adminEmail: 'admin@icart.com' };

describe('Product API integration', () => {
  it('GET /api/products is public and returns a list', async () => {
    const res = await listProducts(makeContext({ url: 'http://localhost/api/products' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('POST /api/products requires admin auth (401 without a session)', async () => {
    const res = await createProduct(
      makeContext({
        url: 'http://localhost/api/products',
        method: 'POST',
        body: { name: 'Notebook', price: 3.5, stock: 100 }
      })
    );
    expect(res.status).toBe(401);
  });

  it('POST /api/products creates a product when authenticated as admin', async () => {
    const res = await createProduct(
      makeContext({
        url: 'http://localhost/api/products',
        method: 'POST',
        body: { name: 'Notebook', description: 'A4 notebook', price: 3.5, stock: 100 },
        session: ADMIN_SESSION
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe('Notebook');
  });

  it('POST /api/products returns 400 for an invalid payload', async () => {
    const res = await createProduct(
      makeContext({
        url: 'http://localhost/api/products',
        method: 'POST',
        body: { name: '', price: -5, stock: 100 },
        session: ADMIN_SESSION
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('InvalidProductError');
  });

  it('GET /api/products/:id returns a single product (public)', async () => {
    const created = await (
      await createProduct(
        makeContext({
          url: 'http://localhost/api/products',
          method: 'POST',
          body: { name: 'Pen', price: 1.2, stock: 50 },
          session: ADMIN_SESSION
        })
      )
    ).json();

    const res = await getProduct(
      makeContext({ url: `http://localhost/api/products/${created.id}`, params: { id: created.id } })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
  });

  it('GET /api/products/:id returns 404 for an unknown id', async () => {
    const res = await getProduct(
      makeContext({ url: 'http://localhost/api/products/unknown-id', params: { id: 'unknown-id' } })
    );
    expect(res.status).toBe(404);
  });

  it('PUT /api/products/:id requires admin auth (401 without a session)', async () => {
    const created = await (
      await createProduct(
        makeContext({
          url: 'http://localhost/api/products',
          method: 'POST',
          body: { name: 'Pen', price: 1.2, stock: 50 },
          session: ADMIN_SESSION
        })
      )
    ).json();

    const res = await updateProduct(
      makeContext({
        url: `http://localhost/api/products/${created.id}`,
        method: 'PUT',
        params: { id: created.id },
        body: { price: 2.0 }
      })
    );
    expect(res.status).toBe(401);
  });

  it('PUT /api/products/:id updates a product when authenticated as admin', async () => {
    const created = await (
      await createProduct(
        makeContext({
          url: 'http://localhost/api/products',
          method: 'POST',
          body: { name: 'Pen', price: 1.2, stock: 50 },
          session: ADMIN_SESSION
        })
      )
    ).json();

    const res = await updateProduct(
      makeContext({
        url: `http://localhost/api/products/${created.id}`,
        method: 'PUT',
        params: { id: created.id },
        body: { price: 2.0 },
        session: ADMIN_SESSION
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.price).toBe(2.0);
  });

  it('DELETE /api/products/:id requires admin auth (401 without a session)', async () => {
    const created = await (
      await createProduct(
        makeContext({
          url: 'http://localhost/api/products',
          method: 'POST',
          body: { name: 'Pen', price: 1.2, stock: 50 },
          session: ADMIN_SESSION
        })
      )
    ).json();

    const res = await deleteProduct(
      makeContext({
        url: `http://localhost/api/products/${created.id}`,
        method: 'DELETE',
        params: { id: created.id }
      })
    );
    expect(res.status).toBe(401);
  });

  it('DELETE /api/products/:id removes a product when authenticated as admin', async () => {
    const created = await (
      await createProduct(
        makeContext({
          url: 'http://localhost/api/products',
          method: 'POST',
          body: { name: 'Pen', price: 1.2, stock: 50 },
          session: ADMIN_SESSION
        })
      )
    ).json();

    const res = await deleteProduct(
      makeContext({
        url: `http://localhost/api/products/${created.id}`,
        method: 'DELETE',
        params: { id: created.id },
        session: ADMIN_SESSION
      })
    );
    expect(res.status).toBe(204);

    const getRes = await getProduct(
      makeContext({ url: `http://localhost/api/products/${created.id}`, params: { id: created.id } })
    );
    expect(getRes.status).toBe(404);
  });

  it('DELETE /api/products/:id returns 404 for an unknown id (admin authenticated)', async () => {
    const res = await deleteProduct(
      makeContext({
        url: 'http://localhost/api/products/unknown-id',
        method: 'DELETE',
        params: { id: 'unknown-id' },
        session: ADMIN_SESSION
      })
    );
    expect(res.status).toBe(404);
  });
});
