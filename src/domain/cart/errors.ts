import { DomainError } from '../shared/errors';

export class InvalidCartOperationError extends DomainError {}

export class CartItemNotFoundError extends DomainError {
  constructor(productId: string) {
    super(`Cart item for product "${productId}" was not found in the cart.`);
  }
}

export class InsufficientStockError extends DomainError {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Cannot fulfill quantity ${requested} for product "${productId}". Only ${available} in stock.`
    );
  }
}