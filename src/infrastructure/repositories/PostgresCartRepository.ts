import { getPool } from '../db/pool';
import { Cart } from '../../domain/cart/Cart';
import { CartItem } from '../../domain/cart/CartItem';
import type { CartRepository } from '../../domain/cart/CartRepository';

export class PostgresCartRepository implements CartRepository {
  async findById(userId: string): Promise<Cart | null> {
    const result = await getPool().query(
      'SELECT product_id, quantity, unit_price, updated_at FROM cart_items WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return null;
    }

    const items = result.rows.map((row) =>
      CartItem.create({
        productId: row.product_id,
        quantity: row.quantity,
        unitPrice: parseFloat(row.unit_price)
      })
    );

    const latestUpdatedAt = result.rows.reduce(
      (latest: Date, row) => (row.updated_at > latest ? row.updated_at : latest),
      result.rows[0].updated_at
    );

    return Cart.reconstitute({ id: userId, items, updatedAt: latestUpdatedAt });
  }

  async save(cart: Cart): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [cart.id]);

      for (const item of cart.items) {
        await client.query(
          `INSERT INTO cart_items (user_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [cart.id, item.productId, item.quantity, item.unitPrice]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}