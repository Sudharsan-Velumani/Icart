import type { AdminUser, AdminUserRepository } from '../../domain/auth/AdminUserRespository';
import { InvalidCredentialsError } from '../../domain/auth/errors';
import type { PasswordHasher } from './PasswordHasher';

export interface AdminLoginCommand {
  email: string;
  password: string;
}

export class AdminLoginUseCase {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(command: AdminLoginCommand): Promise<AdminUser> {
    const normalizedEmail = command.email.trim().toLowerCase();
    const record = await this.adminUserRepository.findByEmail(normalizedEmail);

    if (!record) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(command.password, record.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return { id: record.id, email: record.email };
  }
}