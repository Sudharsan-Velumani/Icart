import { InvalidCartOperationError } from './errors';

export interface CartItemProps {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export class CartItem {
  private constructor(private readonly props: CartItemProps) {}

  static create(props: CartItemProps): CartItem {
    CartItem.validate(props);
    return new CartItem({ ...props });
  }

  private static validate(props: CartItemProps): void {
    if (!props.productId) {
      throw new InvalidCartOperationError('Cart item must reference a product id.');
    }
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new InvalidCartOperationError('Cart item quantity must be a positive integer.');
    }
    if (typeof props.unitPrice !== 'number' || props.unitPrice <= 0) {
      throw new InvalidCartOperationError('Cart item unit price must be a positive number.');
    }
  }

  withQuantity(quantity: number): CartItem {
    return CartItem.create({ ...this.props, quantity });
  }

  get productId(): string { return this.props.productId; }
  get quantity(): number { return this.props.quantity; }
  get unitPrice(): number { return this.props.unitPrice; }

  get subtotal(): number {
    return Number((this.props.unitPrice * this.props.quantity).toFixed(2));
  }

  toSnapshot(): CartItemProps {
    return { ...this.props };
  }
}