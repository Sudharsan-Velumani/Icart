import { describe, it, expect } from 'vitest';
import type { NewUserRecord, UserCredentialsRecord, UserRepository } from '../../../../src/domain/user/UserRepository';
import { SignupUseCase } from '../../../../src/application/user/SignupUseCase';
import { UserLoginUseCase } from '../../../../src/application/user/UserLoginUseCase';
import { bcryptPasswordHasher } from '../../../../src/infrastructure/auth/bcryptPasswordHasher';
import { InvalidCredentialsError } from '../../../../src/domain/auth/errors';
import { EmailAlreadyRegisteredError, InvalidUserRegistrationError } from '../../../../src/domain/user/errors';

class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, UserCredentialsRecord>();

  async findByEmail(email: string): Promise<UserCredentialsRecord | null> {
    return this.store.get(email) ?? null;
  }
  async save(user: NewUserRecord): Promise<void> {
    if (this.store.has(user.email)) {
      throw Object.assign(new Error('duplicate'), { code: '23505' });
    }
    this.store.set(user.email, user);
  }
}

describe('SignupUseCase', () => {
  it('creates a new user and hashes the password', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new SignupUseCase(repo, bcryptPasswordHasher);

    const user = await useCase.execute({ email: 'jane@icart.com', password: 'MyPassword123', name: 'Jane Doe' });
    expect(user.email).toBe('jane@icart.com');
    expect(user.name).toBe('Jane Doe');

    const stored = await repo.findByEmail('jane@icart.com');
    expect(stored?.passwordHash).not.toBe('MyPassword123'); // never stored in plaintext
  });

  it('rejects a password shorter than 8 characters', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new SignupUseCase(repo, bcryptPasswordHasher);

    await expect(
      useCase.execute({ email: 'bob@icart.com', password: 'short', name: 'Bob' })
    ).rejects.toThrow(InvalidUserRegistrationError);
  });

  it('rejects an invalid email format', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new SignupUseCase(repo, bcryptPasswordHasher);

    await expect(
      useCase.execute({ email: 'not-an-email', password: 'ValidPass123', name: 'Bob' })
    ).rejects.toThrow(InvalidUserRegistrationError);
  });

  it('rejects signing up twice with the same email', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new SignupUseCase(repo, bcryptPasswordHasher);

    await useCase.execute({ email: 'jane@icart.com', password: 'MyPassword123', name: 'Jane' });
    await expect(
      useCase.execute({ email: 'jane@icart.com', password: 'AnotherPass1', name: 'Jane 2' })
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });
});

describe('UserLoginUseCase', () => {
  it('logs in with correct credentials', async () => {
    const repo = new InMemoryUserRepository();
    const signup = new SignupUseCase(repo, bcryptPasswordHasher);
    const login = new UserLoginUseCase(repo, bcryptPasswordHasher);

    await signup.execute({ email: 'jane@icart.com', password: 'MyPassword123', name: 'Jane' });
    const result = await login.execute({ email: 'jane@icart.com', password: 'MyPassword123' });

    expect(result.email).toBe('jane@icart.com');
    expect(result.name).toBe('Jane');
  });

  it('rejects a wrong password', async () => {
    const repo = new InMemoryUserRepository();
    const signup = new SignupUseCase(repo, bcryptPasswordHasher);
    const login = new UserLoginUseCase(repo, bcryptPasswordHasher);

    await signup.execute({ email: 'jane@icart.com', password: 'MyPassword123', name: 'Jane' });
    await expect(login.execute({ email: 'jane@icart.com', password: 'WrongPassword' })).rejects.toThrow(
      InvalidCredentialsError
    );
  });

  it('rejects an unknown email', async () => {
    const repo = new InMemoryUserRepository();
    const login = new UserLoginUseCase(repo, bcryptPasswordHasher);

    await expect(login.execute({ email: 'nobody@icart.com', password: 'anything' })).rejects.toThrow(
      InvalidCredentialsError
    );
  });
});
