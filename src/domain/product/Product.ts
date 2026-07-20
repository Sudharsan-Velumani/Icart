import { randomUUID } from 'node:crypto';
import { InvalidProductError } from './errors';

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
}

export class Product {
  private constructor(private props: ProductProps) {}

  static create(input: CreateProductInput): Product {
    const now = new Date();
    const props: ProductProps = {
      id: randomUUID(),
      name: input.name?.trim() ?? '',
      description: input.description?.trim() ?? '',
      price: input.price,
      stock: input.stock,
      imageUrl: input.imageUrl?.trim() ?? '',
      createdAt: now,
      updatedAt: now
    };
    Product.validate(props);
    return new Product(props);
  }

  static reconstitute(props: ProductProps): Product {
    Product.validate(props);
    return new Product({ ...props });
  }

  private static validate(props: ProductProps): void {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidProductError('Product name must not be empty.');
    }
    if (props.name.length > 200) {
      throw new InvalidProductError('Product name must not exceed 200 characters.');
    }
    if (props.description.length > 2000) {
      throw new InvalidProductError('Product description must not exceed 2000 characters.');
    }
    if (typeof props.price !== 'number' || Number.isNaN(props.price) || !Number.isFinite(props.price)) {
      throw new InvalidProductError('Product price must be a valid number.');
    }
    if (props.price <= 0) {
      throw new InvalidProductError('Product price must be greater than zero.');
    }
    if (typeof props.stock !== 'number' || !Number.isInteger(props.stock)) {
      throw new InvalidProductError('Product stock must be an integer.');
    }
    if (props.stock < 0) {
      throw new InvalidProductError('Product stock must not be negative.');
    }
    if (props.imageUrl.length > 0) {
      if (props.imageUrl.length > 2000) {
        throw new InvalidProductError('Image URL must not exceed 2000 characters.');
      }
      if (!/^https?:\/\//i.test(props.imageUrl)) {
        throw new InvalidProductError('Image URL must start with http:// or https://.');
      }
    }
  }

  update(input: UpdateProductInput): void {
    const next: ProductProps = {
      ...this.props,
      name: input.name !== undefined ? input.name.trim() : this.props.name,
      description: input.description !== undefined ? input.description.trim() : this.props.description,
      price: input.price !== undefined ? input.price : this.props.price,
      stock: input.stock !== undefined ? input.stock : this.props.stock,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl.trim() : this.props.imageUrl,
      updatedAt: new Date()
    };
    Product.validate(next);
    this.props = next;
  }

  hasSufficientStock(quantity: number): boolean {
    return this.props.stock >= quantity;
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get price(): number { return this.props.price; }
  get stock(): number { return this.props.stock; }
  get imageUrl(): string { return this.props.imageUrl; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  toSnapshot(): ProductProps {
    return { ...this.props };
  }
}