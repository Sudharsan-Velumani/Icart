import { describe, it, expect } from 'vitest';
import { Product } from '../../../../src/domain/product/Product';
import { InvalidProductError } from '../../../../src/domain/product/errors';

describe('Product', () => {
  describe('create', () => {
    it('creates a valid product with generated id and timestamps', () => {
      const product = Product.create({ name: 'Wireless Mouse', description: 'Ergonomic', price: 19.99, stock: 50 });

      expect(product.id).toBeTruthy();
      expect(product.name).toBe('Wireless Mouse');
      expect(product.description).toBe('Ergonomic');
      expect(product.price).toBe(19.99);
      expect(product.stock).toBe(50);
      expect(product.imageUrl).toBe('');
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });

    it('trims whitespace from name and description', () => {
      const product = Product.create({ name: '  Lamp  ', description: '  Desk lamp  ', price: 10, stock: 1 });
      expect(product.name).toBe('Lamp');
      expect(product.description).toBe('Desk lamp');
    });

    it('defaults description to empty string when omitted', () => {
      const product = Product.create({ name: 'Mug', price: 5, stock: 3 });
      expect(product.description).toBe('');
    });

    it('accepts an optional image URL', () => {
      const product = Product.create({ name: 'Mouse', price: 10, stock: 5, imageUrl: 'https://example.com/mouse.jpg' });
      expect(product.imageUrl).toBe('https://example.com/mouse.jpg');
    });

    it.each(['', '   '])('rejects an empty or blank name ("%s")', (name) => {
      expect(() => Product.create({ name, price: 10, stock: 1 })).toThrow(InvalidProductError);
    });

    it('rejects a name longer than 200 characters', () => {
      const longName = 'a'.repeat(201);
      expect(() => Product.create({ name: longName, price: 10, stock: 1 })).toThrow(InvalidProductError);
    });

    it('rejects a description longer than 2000 characters', () => {
      const longDesc = 'a'.repeat(2001);
      expect(() => Product.create({ name: 'Item', description: longDesc, price: 10, stock: 1 })).toThrow(
        InvalidProductError
      );
    });

    it.each([0, -1, -100])('rejects a non-positive price (%d)', (price) => {
      expect(() => Product.create({ name: 'Item', price, stock: 1 })).toThrow(InvalidProductError);
    });

    it('rejects a NaN price', () => {
      expect(() => Product.create({ name: 'Item', price: NaN, stock: 1 })).toThrow(InvalidProductError);
    });

    it.each([-1, -50])('rejects a negative stock (%d)', (stock) => {
      expect(() => Product.create({ name: 'Item', price: 10, stock })).toThrow(InvalidProductError);
    });

    it('rejects a non-integer stock', () => {
      expect(() => Product.create({ name: 'Item', price: 10, stock: 1.5 })).toThrow(InvalidProductError);
    });

    it('allows stock of zero (out of stock is valid)', () => {
      const product = Product.create({ name: 'Item', price: 10, stock: 0 });
      expect(product.stock).toBe(0);
    });

    it('rejects an image URL without http/https protocol', () => {
      expect(() =>
        Product.create({ name: 'Item', price: 10, stock: 1, imageUrl: 'javascript:alert(1)' })
      ).toThrow(InvalidProductError);
    });

    it('rejects an image URL that is too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      expect(() => Product.create({ name: 'Item', price: 10, stock: 1, imageUrl: longUrl })).toThrow(
        InvalidProductError
      );
    });
  });

  describe('update', () => {
    it('updates only the provided fields and bumps updatedAt', async () => {
      const product = Product.create({ name: 'Desk', price: 100, stock: 5 });
      const originalUpdatedAt = product.updatedAt;

      await new Promise((r) => setTimeout(r, 5));
      product.update({ price: 120 });

      expect(product.name).toBe('Desk');
      expect(product.price).toBe(120);
      expect(product.stock).toBe(5);
      expect(product.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('updates the image URL independently of other fields', () => {
      const product = Product.create({ name: 'Desk', price: 100, stock: 5 });
      product.update({ imageUrl: 'https://example.com/desk.jpg' });
      expect(product.imageUrl).toBe('https://example.com/desk.jpg');
      expect(product.name).toBe('Desk');
    });

    it('rejects an update that violates invariants and keeps the previous state', () => {
      const product = Product.create({ name: 'Desk', price: 100, stock: 5 });
      expect(() => product.update({ price: -1 })).toThrow(InvalidProductError);
      expect(product.price).toBe(100);
    });
  });

  describe('hasSufficientStock', () => {
    it('returns true when stock covers requested quantity', () => {
      const product = Product.create({ name: 'Desk', price: 100, stock: 5 });
      expect(product.hasSufficientStock(5)).toBe(true);
      expect(product.hasSufficientStock(3)).toBe(true);
    });

    it('returns false when stock is insufficient', () => {
      const product = Product.create({ name: 'Desk', price: 100, stock: 5 });
      expect(product.hasSufficientStock(6)).toBe(false);
    });
  });

  describe('reconstitute', () => {
    it('rebuilds a product from a persisted snapshot', () => {
      const original = Product.create({ name: 'Desk', price: 100, stock: 5 });
      const snapshot = original.toSnapshot();
      const rebuilt = Product.reconstitute(snapshot);

      expect(rebuilt.id).toBe(original.id);
      expect(rebuilt.name).toBe(original.name);
      expect(rebuilt.price).toBe(original.price);
    });

    it('still enforces invariants on reconstitution', () => {
      const badSnapshot = {
        id: 'x',
        name: '',
        description: '',
        price: 10,
        stock: 1,
        imageUrl: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(() => Product.reconstitute(badSnapshot)).toThrow(InvalidProductError);
    });
  });
});
