import { getPool } from '../db/pool';
import type {
  AdminCredentialsRecord,
  AdminUserRepository
} from '../../domain/auth/AdminUserRespository';

export class PostgresAdminUserRepository implements AdminUserRepository {
  async findByEmail(email: string): Promise<AdminCredentialsRecord | null> {
    const result = await getPool().query(
      'SELECT id, email, password_hash FROM admin_users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return { id: row.id, email: row.email, passwordHash: row.password_hash };
  }
}