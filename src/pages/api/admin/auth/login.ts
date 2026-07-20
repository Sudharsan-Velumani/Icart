import type { APIRoute } from 'astro';
import { authContainer } from '../../../../infrastructure/authContainer';
import { errorResponse, jsonResponse, parseJsonBody } from '../../../../infrastructure/http/errorMapper';

export const prerender = false;

interface LoginRequestBody {
  email: string;
  password: string;
}

export const POST: APIRoute = async ({ request, session }) => {
  try {
    const body = await parseJsonBody<LoginRequestBody>(request);
    const admin = await authContainer.adminLogin.execute(body);

    session?.set('adminId', admin.id);
    session?.set('adminEmail', admin.email);

    return jsonResponse({ id: admin.id, email: admin.email });
  } catch (error) {
    return errorResponse(error);
  }
};