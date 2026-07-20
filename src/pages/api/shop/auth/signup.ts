import type { APIRoute } from 'astro';
import { authContainer } from '../../../../infrastructure/authContainer';
import { errorResponse, jsonResponse, parseJsonBody } from '../../../../infrastructure/http/errorMapper';

export const prerender = false;

interface SignupRequestBody {
  email: string;
  password: string;
  name: string;
}

export const POST: APIRoute = async ({ request, session }) => {
  try {
    const body = await parseJsonBody<SignupRequestBody>(request);
    const user = await authContainer.userSignup.execute(body);

    session?.set('userId', user.id);
    session?.set('userEmail', user.email);
    session?.set('userName', user.name);

    return jsonResponse({ id: user.id, email: user.email, name: user.name }, 201);
  } catch (error) {
    return errorResponse(error);
  }
};