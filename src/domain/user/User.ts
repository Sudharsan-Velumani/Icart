import { randomUUID } from 'node:crypto';
import { InvalidUserRegistrationError } from './errors';

export interface UserProps {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface RegisterUserInput {
  email: string;
  name: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class User {
  private constructor(private props: UserProps) {}

  static register(input: RegisterUserInput): User {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (!EMAIL_REGEX.test(email)) {
      throw new InvalidUserRegistrationError('Please provide a valid email address.');
    }
    if (name.length === 0) {
      throw new InvalidUserRegistrationError('Name must not be empty.');
    }
    if (name.length > 200) {
      throw new InvalidUserRegistrationError('Name must not exceed 200 characters.');
    }

    return new User({ id: randomUUID(), email, name, createdAt: new Date() });
  }

  static reconstitute(props: UserProps): User {
    return new User({ ...props });
  }

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get name(): string { return this.props.name; }
  get createdAt(): Date { return this.props.createdAt; }

  toSnapshot(): UserProps {
    return { ...this.props };
  }
}