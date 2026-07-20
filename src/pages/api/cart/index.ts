import type { APIRoute } from 'astro';
import { cartContainer } from '../../../infrastructure/cartContainer';
import { requireUserId } from '../../../infrastructure/http/requireUserId';
import { errorResponse, jsonResponse } from '../../../infrastructure/http/errorMapper';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const userIdOrResponse = await requireUserId(context);
  if (userIdOrResponse instanceof Response) return userIdOrResponse;

  try {
    const cart = await cartContainer.getCart.execute(userIdOrResponse);
    return jsonResponse(cart);
  } catch (error) {
    return errorResponse(error);
  }
};