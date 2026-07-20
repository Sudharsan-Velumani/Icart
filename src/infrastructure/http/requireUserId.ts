import type { APIContext } from 'astro';

export async function requireUserId(context: Pick<APIContext, 'session'>): Promise<string | Response> {
  const userId = await context.session?.get('userId');
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Login required.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return userId;
}