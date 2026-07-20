import { DomainError } from '../shared/errors';

export class InvalidProductError extends DomainError {}

export class ProductNotFoundError extends DomainError {
  constructor(productId: string) {
    super(`Product with id "${productId}" was not found.`);
  }
}