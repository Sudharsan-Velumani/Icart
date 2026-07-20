import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getPool } from '../src/infrastructure/db/pool';

const BCRYPT_SALT_ROUNDS = 12;

async function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error('Usage: npm run seed:admin -- <email> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, email, created_at`,
      [normalizedEmail, passwordHash]
    );
    console.log('Admin user ready:', result.rows[0]);
  } catch (error) {
    console.error('Failed to seed admin user:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();