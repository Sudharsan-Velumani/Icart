import { CartItem } from './CartItem';
import { CartItemNotFoundError, InsufficientStockError, InvalidCartOperationError } from './errors';
import type { Product } from '../product/Product';

export interface CartProps {
  id: string;
  items: CartItem[];
  updatedAt: Date;
}

export class Cart {
  private constructor(private props: CartProps) {}

  static createEmpty(id: string): Cart {
    return new Cart({ id, items: [], updatedAt: new Date() });
  }

  static reconstitute(props: CartProps): Cart {
    return new Cart({ ...props, items: [...props.items] });
  }

  get id(): string { return this.props.id; }
  get items(): ReadonlyArray<CartItem> { return this.props.items; }
  get updatedAt(): Date { return this.props.updatedAt; }

  get totalItemCount(): number {
    return this.props.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get totalPrice(): number {
    return Number(this.props.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  }

  private findItem(productId: string): CartItem | undefined {
    return this.props.items.find((item) => item.productId === productId);
  }

  addItem(product: Product, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidCartOperationError('Quantity to add must be a positive integer.');
    }

    const existing = this.findItem(product.id);
    const newQuantity = (existing?.quantity ?? 0) + quantity;

    if (!product.hasSufficientStock(newQuantity)) {
      throw new InsufficientStockError(product.id, newQuantity, product.stock);
    }

    const updatedItem = CartItem.create({
      productId: product.id,
      quantity: newQuantity,
      unitPrice: product.price
    });

    this.props.items = existing
      ? this.props.items.map((item) => (item.productId === product.id ? updatedItem : item))
      : [...this.props.items, updatedItem];

    this.props.updatedAt = new Date();
  }

  removeItem(productId: string): void {
    if (!this.findItem(productId)) {
      throw new CartItemNotFoundError(productId);
    }
    this.props.items = this.props.items.filter((item) => item.productId !== productId);
    this.props.updatedAt = new Date();
  }

  updateItemQuantity(productId: string, quantity: number, product: Product): void {
    const existing = this.findItem(productId);
    if (!existing) {
      throw new CartItemNotFoundError(productId);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidCartOperationError('Updated quantity must be a positive integer.');
    }
    if (!product.hasSufficientStock(quantity)) {
      throw new InsufficientStockError(productId, quantity, product.stock);
    }

    const updatedItem = existing.withQuantity(quantity);
    this.props.items = this.props.items.map((item) =>
      item.productId === productId ? updatedItem : item
    );
    this.props.updatedAt = new Date();
  }

  toSnapshot(): CartProps {
    return { ...this.props, items: [...this.props.items] };
  }
}