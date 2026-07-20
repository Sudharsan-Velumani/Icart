import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ session }) => {
  await session?.destroy();
  return new Response(null, { status: 204 });
};