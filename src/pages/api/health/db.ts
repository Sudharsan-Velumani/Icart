import type { APIRoute } from 'astro';
import { getPool } from '../../../infrastructure/db/pool';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const result = await getPool().query('SELECT NOW() as server_time, current_database() as db');
    return new Response(
      JSON.stringify({
        status: 'connected',
        database: result.rows[0].db,
        serverTime: result.rows[0].server_time
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'error', message: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};