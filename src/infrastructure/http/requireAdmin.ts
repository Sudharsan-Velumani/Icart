import type { APIContext } from 'astro';

export async function requireAdmin(context: Pick<APIContext, 'session'>): Promise<Response | null> {
  const adminId = await context.session?.get('adminId');
  if (!adminId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Admin authentication required.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}