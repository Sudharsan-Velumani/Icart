import { InvalidCredentialsError } from '../../domain/auth/errors';
import type { PublicUser, UserRepository } from '../../domain/user/UserRepository';
import type { PasswordHasher } from '../auth/PasswordHasher';

export interface UserLoginCommand {
  email: string;
  password: string;
}

export class UserLoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(command: UserLoginCommand): Promise<PublicUser> {
    const normalizedEmail = command.email.trim().toLowerCase();
    const record = await this.userRepository.findByEmail(normalizedEmail);

    if (!record) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(command.password, record.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return { id: record.id, email: record.email, name: record.name };
  }
}