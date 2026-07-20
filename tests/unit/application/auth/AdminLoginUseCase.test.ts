import { describe, it, expect } from 'vitest';
import type { AdminCredentialsRecord, AdminUserRepository } from '../../../../src/domain/auth/AdminUserRepository';
import { AdminLoginUseCase } from '../../../../src/application/auth/AdminLoginUseCase';
import { bcryptPasswordHasher } from '../../../../src/infrastructure/auth/bcryptPasswordHasher';
import { InvalidCredentialsError } from '../../../../src/domain/auth/errors';

class InMemoryAdminUserRepository implements AdminUserRepository {
  constructor(private readonly records: AdminCredentialsRecord[]) {}
  async findByEmail(email: string): Promise<AdminCredentialsRecord | null> {
    return this.records.find((r) => r.email === email) ?? null;
  }
}

describe('AdminLoginUseCase', () => {
  it('logs in with correct credentials', async () => {
    const passwordHash = await bcryptPasswordHasher.hash('CorrectPass123');
    const repo = new InMemoryAdminUserRepository([{ id: 'admin-1', email: 'admin@icart.com', passwordHash }]);
    const useCase = new AdminLoginUseCase(repo, bcryptPasswordHasher);

    const result = await useCase.execute({ email: 'admin@icart.com', password: 'CorrectPass123' });
    expect(result).toEqual({ id: 'admin-1', email: 'admin@icart.com' });
  });

  it('normalizes email case and whitespace before lookup', async () => {
    const passwordHash = await bcryptPasswordHasher.hash('CorrectPass123');
    const repo = new InMemoryAdminUserRepository([{ id: 'admin-1', email: 'admin@icart.com', passwordHash }]);
    const useCase = new AdminLoginUseCase(repo, bcryptPasswordHasher);

    const result = await useCase.execute({ email: '  Admin@ICart.com  ', password: 'CorrectPass123' });
    expect(result.email).toBe('admin@icart.com');
  });

  it('rejects a wrong password with a generic error', async () => {
    const passwordHash = await bcryptPasswordHasher.hash('CorrectPass123');
    const repo = new InMemoryAdminUserRepository([{ id: 'admin-1', email: 'admin@icart.com', passwordHash }]);
    const useCase = new AdminLoginUseCase(repo, bcryptPasswordHasher);

    await expect(useCase.execute({ email: 'admin@icart.com', password: 'WrongPassword' })).rejects.toThrow(
      InvalidCredentialsError
    );
  });

  it('rejects an unknown email with the SAME generic error (no user enumeration)', async () => {
    const repo = new InMemoryAdminUserRepository([]);
    const useCase = new AdminLoginUseCase(repo, bcryptPasswordHasher);

    await expect(useCase.execute({ email: 'nobody@icart.com', password: 'anything' })).rejects.toThrow(
      InvalidCredentialsError
    );
  });
});
