import { getPool } from '../db/pool';
import { Product, type ProductProps } from '../../domain/product/Product';
import type { ProductRepository } from '../../domain/product/ProductRepository';

export class PostgresProductRepository implements ProductRepository {
  async save(product: Product): Promise<void> {
    const snap = product.toSnapshot();
    await getPool().query(
      `INSERT INTO products (id, name, description, price, stock, image_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         price = EXCLUDED.price,
         stock = EXCLUDED.stock,
         image_url = EXCLUDED.image_url,
         updated_at = EXCLUDED.updated_at`,
      [snap.id, snap.name, snap.description, snap.price, snap.stock, snap.imageUrl, snap.createdAt, snap.updatedAt]
    );
  }

  async findById(id: string): Promise<Product | null> {
    const result = await getPool().query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return rowToProduct(result.rows[0]);
  }

  async findAll(): Promise<Product[]> {
    const result = await getPool().query('SELECT * FROM products ORDER BY created_at DESC');
    return result.rows.map(rowToProduct);
  }

  async delete(id: string): Promise<void> {
    await getPool().query('DELETE FROM products WHERE id = $1', [id]);
  }

  async existsById(id: string): Promise<boolean> {
    const result = await getPool().query('SELECT 1 FROM products WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

function rowToProduct(row: {
  id: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  image_url: string;
  created_at: Date;
  updated_at: Date;
}): Product {
  const props: ProductProps = {
    id: row.id,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    stock: row.stock,
    imageUrl: row.image_url ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  return Product.reconstitute(props);
}