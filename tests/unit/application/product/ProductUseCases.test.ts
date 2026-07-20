import { describe, it, expect, beforeEach } from 'vitest';
import type { Product } from '../../../../src/domain/product/Product';
import type { ProductRepository } from '../../../../src/domain/product/ProductRepository';
import { AddProductUseCase } from '../../../../src/application/product/AddProductUseCase';
import { UpdateProductUseCase } from '../../../../src/application/product/UpdateProductUseCase';
import { DeleteProductUseCase } from '../../../../src/application/product/DeleteProductUseCase';
import { GetProductUseCase, ListProductsUseCase } from '../../../../src/application/product/GetProductUseCase';
import { ProductNotFoundError, InvalidProductError } from '../../../../src/domain/product/errors';

/** Minimal in-memory test double for ProductRepository -- no mocking library needed. */
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

describe('Product use cases', () => {
  let repository: InMemoryProductRepository;
  let addProduct: AddProductUseCase;
  let updateProduct: UpdateProductUseCase;
  let deleteProduct: DeleteProductUseCase;
  let getProduct: GetProductUseCase;
  let listProducts: ListProductsUseCase;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    addProduct = new AddProductUseCase(repository);
    updateProduct = new UpdateProductUseCase(repository);
    deleteProduct = new DeleteProductUseCase(repository);
    getProduct = new GetProductUseCase(repository);
    listProducts = new ListProductsUseCase(repository);
  });

  describe('AddProductUseCase', () => {
    it('adds a product and persists it', async () => {
      const product = await addProduct.execute({ name: 'Book', price: 12.5, stock: 20 });
      const found = await repository.findById(product.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Book');
    });

    it('rejects adding an invalid product', async () => {
      await expect(addProduct.execute({ name: '', price: 12.5, stock: 20 })).rejects.toThrow(
        InvalidProductError
      );
    });

    it('accepts an optional image URL', async () => {
      const product = await addProduct.execute({
        name: 'Book',
        price: 12.5,
        stock: 20,
        imageUrl: 'https://example.com/book.jpg'
      });
      expect(product.imageUrl).toBe('https://example.com/book.jpg');
    });
  });

  describe('UpdateProductUseCase', () => {
    it('updates an existing product', async () => {
      const product = await addProduct.execute({ name: 'Book', price: 12.5, stock: 20 });
      const updated = await updateProduct.execute({ id: product.id, price: 15 });
      expect(updated.price).toBe(15);
      expect(updated.name).toBe('Book');
    });

    it('throws when updating a non-existent product', async () => {
      await expect(updateProduct.execute({ id: 'missing', price: 15 })).rejects.toThrow(
        ProductNotFoundError
      );
    });

    it('rejects an update that violates invariants', async () => {
      const product = await addProduct.execute({ name: 'Book', price: 12.5, stock: 20 });
      await expect(updateProduct.execute({ id: product.id, price: -5 })).rejects.toThrow(
        InvalidProductError
      );
    });
  });

  describe('DeleteProductUseCase', () => {
    it('deletes an existing product', async () => {
      const product = await addProduct.execute({ name: 'Book', price: 12.5, stock: 20 });
      await deleteProduct.execute(product.id);
      expect(await repository.existsById(product.id)).toBe(false);
    });

    it('throws when deleting a non-existent product', async () => {
      await expect(deleteProduct.execute('missing')).rejects.toThrow(ProductNotFoundError);
    });
  });

  describe('GetProductUseCase', () => {
    it('fetches a product by id', async () => {
      const product = await addProduct.execute({ name: 'Book', price: 12.5, stock: 20 });
      const fetched = await getProduct.execute(product.id);
      expect(fetched.id).toBe(product.id);
    });

    it('throws when fetching a non-existent product', async () => {
      await expect(getProduct.execute('missing')).rejects.toThrow(ProductNotFoundError);
    });
  });

  describe('ListProductsUseCase', () => {
    it('lists all products', async () => {
      await addProduct.execute({ name: 'Book', price: 12.5, stock: 20 });
      await addProduct.execute({ name: 'Pen', price: 1.5, stock: 100 });
      const all = await listProducts.execute();
      expect(all).toHaveLength(2);
    });

    it('returns an empty array when there are no products', async () => {
      const all = await listProducts.execute();
      expect(all).toHaveLength(0);
    });
  });
});
