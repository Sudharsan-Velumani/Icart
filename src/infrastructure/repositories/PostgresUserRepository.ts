import { getPool } from '../db/pool';
import { EmailAlreadyRegisteredError } from '../../domain/user/errors';
import type {
  NewUserRecord,
  UserCredentialsRecord,
  UserRepository
} from '../../domain/user/UserRepository';

const UNIQUE_VIOLATION = '23505';

export class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserCredentialsRecord | null> {
    const result = await getPool().query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, passwordHash: row.password_hash };
  }

  async save(user: NewUserRecord): Promise<void> {
    try {
      await getPool().query(
        `INSERT INTO users (id, email, name, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [user.id, user.email, user.name, user.passwordHash]
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === UNIQUE_VIOLATION;
}