import { DomainError } from '../shared/errors';

export class InvalidUserRegistrationError extends DomainError {}

export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    super('An account with this email already exists.');
  }
}