import { DomainError } from '../shared/errors';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid email or password.');
  }
}