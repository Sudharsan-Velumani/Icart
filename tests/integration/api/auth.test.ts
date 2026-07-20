import { describe, it, expect, vi } from 'vitest';
import { makeContext } from '../testContext';

/**
 * Replace the Postgres-backed auth container with one wired to in-memory
 * repositories, using the real use case + bcrypt hasher (same code path as
 * production). This lets us integration-test the login/signup routes
 * without a real database.
 */
vi.mock('../../../src/infrastructure/authContainer', async () => {
  const { AdminLoginUseCase } = await import('../../../src/application/auth/AdminLoginUseCase');
  const { SignupUseCase } = await import('../../../src/application/user/SignupUseCase');
  const { UserLoginUseCase } = await import('../../../src/application/user/UserLoginUseCase');
  const { bcryptPasswordHasher } = await import('../../../src/infrastructure/auth/bcryptPasswordHasher');

  const adminPasswordHash = await bcryptPasswordHasher.hash('AdminPass123');
  const adminRecords = [{ id: 'admin-1', email: 'admin@icart.com', passwordHash: adminPasswordHash }];
  const adminRepo = {
    async findByEmail(email: string) {
      return adminRecords.find((r) => r.email === email) ?? null;
    }
  };

  const userStore = new Map<string, any>();
  const userRepo = {
    async findByEmail(email: string) {
      return userStore.get(email) ?? null;
    },
    async save(user: any) {
      if (userStore.has(user.email)) {
        throw Object.assign(new Error('duplicate'), { code: '23505' });
      }
      userStore.set(user.email, user);
    }
  };

  return {
    authContainer: {
      adminLogin: new AdminLoginUseCase(adminRepo as any, bcryptPasswordHasher),
      userSignup: new SignupUseCase(userRepo as any, bcryptPasswordHasher),
      userLogin: new UserLoginUseCase(userRepo as any, bcryptPasswordHasher)
    }
  };
});

const { POST: adminLogin } = await import('../../../src/pages/api/admin/auth/login');
const { POST: shopSignup } = await import('../../../src/pages/api/shop/auth/signup');
const { POST: shopLogin } = await import('../../../src/pages/api/shop/auth/login');

describe('Admin auth API integration', () => {
  it('logs in successfully with correct credentials', async () => {
    const res = await adminLogin(
      makeContext({
        url: 'http://localhost/api/admin/auth/login',
        method: 'POST',
        body: { email: 'admin@icart.com', password: 'AdminPass123' }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe('admin@icart.com');
  });

  it('rejects an incorrect password with 401', async () => {
    const res = await adminLogin(
      makeContext({
        url: 'http://localhost/api/admin/auth/login',
        method: 'POST',
        body: { email: 'admin@icart.com', password: 'WrongPassword' }
      })
    );
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with the same 401 (no user enumeration)', async () => {
    const res = await adminLogin(
      makeContext({
        url: 'http://localhost/api/admin/auth/login',
        method: 'POST',
        body: { email: 'nobody@icart.com', password: 'anything' }
      })
    );
    expect(res.status).toBe(401);
  });
});

describe('Shop signup/login API integration', () => {
  it('signs up a new customer successfully', async () => {
    const res = await shopSignup(
      makeContext({
        url: 'http://localhost/api/shop/auth/signup',
        method: 'POST',
        body: { email: 'newcustomer@icart.com', password: 'MyPassword123', name: 'New Customer' }
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toBe('newcustomer@icart.com');
  });

  it('rejects signup with a short password', async () => {
    const res = await shopSignup(
      makeContext({
        url: 'http://localhost/api/shop/auth/signup',
        method: 'POST',
        body: { email: 'someone@icart.com', password: 'short', name: 'Someone' }
      })
    );
    expect(res.status).toBe(400);
  });

  it('rejects signing up twice with the same email', async () => {
    await shopSignup(
      makeContext({
        url: 'http://localhost/api/shop/auth/signup',
        method: 'POST',
        body: { email: 'duplicate@icart.com', password: 'MyPassword123', name: 'First' }
      })
    );
    const res = await shopSignup(
      makeContext({
        url: 'http://localhost/api/shop/auth/signup',
        method: 'POST',
        body: { email: 'duplicate@icart.com', password: 'AnotherPass1', name: 'Second' }
      })
    );
    expect(res.status).toBe(409);
  });

  it('logs in an existing customer', async () => {
    await shopSignup(
      makeContext({
        url: 'http://localhost/api/shop/auth/signup',
        method: 'POST',
        body: { email: 'existing@icart.com', password: 'MyPassword123', name: 'Existing' }
      })
    );
    const res = await shopLogin(
      makeContext({
        url: 'http://localhost/api/shop/auth/login',
        method: 'POST',
        body: { email: 'existing@icart.com', password: 'MyPassword123' }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe('existing@icart.com');
  });

  it('rejects login with a wrong password', async () => {
    await shopSignup(
      makeContext({
        url: 'http://localhost/api/shop/auth/signup',
        method: 'POST',
        body: { email: 'wrongpass@icart.com', password: 'MyPassword123', name: 'Person' }
      })
    );
    const res = await shopLogin(
      makeContext({
        url: 'http://localhost/api/shop/auth/login',
        method: 'POST',
        body: { email: 'wrongpass@icart.com', password: 'IncorrectPassword' }
      })
    );
    expect(res.status).toBe(401);
  });
});
