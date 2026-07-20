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
    const user = await authContainer.userLogin.execute(body);

    session?.set('userId', user.id);
    session?.set('userEmail', user.email);
    session?.set('userName', user.name);

    return jsonResponse({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    return errorResponse(error);
  }
};