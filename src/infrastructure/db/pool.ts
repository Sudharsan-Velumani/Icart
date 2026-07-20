import { Pool } from 'pg';
import dns from 'node:dns';
import net from 'node:net';
import 'dotenv/config';

// Fix for Docker/WSL2 networking: Node's default "Happy Eyeballs" dual-stack
// connection racing (parallel IPv4/IPv6 attempts with a short per-attempt
// timeout) times out prematurely over Docker's NAT layer, even when a plain
// single-target connection to the same host succeeds instantly. Forcing
// IPv4-first resolution and disabling the racing behavior reverts to the
// simpler "resolve, then connect to first address" behavior.
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(false);

let pool: Pool | undefined;

/**
 * Lazily creates (and reuses) a single shared connection pool for the whole app.
 * Lazy init means a missing/bad DATABASE_URL surfaces as a normal catchable error
 * at first query time, not a hard crash when the module is first imported.
 *
 * Neon (and most managed Postgres providers) require SSL; rejectUnauthorized: false
 * is standard here because Neon's certs aren't always in Node's default trust store.
 */
export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Copy .env.example to .env and fill in your Neon connection string.'
    );
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Unexpected error on idle Postgres client', err);
  });

  return pool;
}