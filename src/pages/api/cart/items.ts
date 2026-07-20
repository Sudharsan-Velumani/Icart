import type { APIRoute } from 'astro';
import { cartContainer } from '../../../infrastructure/cartContainer';
import { requireUserId } from '../../../infrastructure/http/requireUserId';
import { errorResponse, jsonResponse, parseJsonBody } from '../../../infrastructure/http/errorMapper';

export const prerender = false;

interface AddItemBody {
  productId: string;
  quantity: number;
}

export const POST: APIRoute = async (context) => {
  const userIdOrResponse = await requireUserId(context);
  if (userIdOrResponse instanceof Response) return userIdOrResponse;

  try {
    const body = await parseJsonBody<AddItemBody>(context.request);
    await cartContainer.addItemToCart.execute({
      userId: userIdOrResponse,
      productId: body.productId,
      quantity: body.quantity
    });
    const cartView = await cartContainer.getCart.execute(userIdOrResponse);
    return jsonResponse(cartView, 201);
  } catch (error) {
    return errorResponse(error);
  }
};