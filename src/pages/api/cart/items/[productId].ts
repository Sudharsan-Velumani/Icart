import type { APIRoute } from 'astro';
import { cartContainer } from '../../../../infrastructure/cartContainer';
import { requireUserId } from '../../../../infrastructure/http/requireUserId';
import { errorResponse, jsonResponse, parseJsonBody } from '../../../../infrastructure/http/errorMapper';

export const prerender = false;

interface UpdateQuantityBody {
  quantity: number;
}

export const PUT: APIRoute = async (context) => {
  const userIdOrResponse = await requireUserId(context);
  if (userIdOrResponse instanceof Response) return userIdOrResponse;

  try {
    const body = await parseJsonBody<UpdateQuantityBody>(context.request);
    await cartContainer.updateItemQuantity.execute({
      userId: userIdOrResponse,
      productId: context.params.productId as string,
      quantity: body.quantity
    });
    const cartView = await cartContainer.getCart.execute(userIdOrResponse);
    return jsonResponse(cartView);
  } catch (error) {
    return errorResponse(error);
  }
};

export const DELETE: APIRoute = async (context) => {
  const userIdOrResponse = await requireUserId(context);
  if (userIdOrResponse instanceof Response) return userIdOrResponse;

  try {
    await cartContainer.removeItemFromCart.execute({
      userId: userIdOrResponse,
      productId: context.params.productId as string
    });
    const cartView = await cartContainer.getCart.execute(userIdOrResponse);
    return jsonResponse(cartView);
  } catch (error) {
    return errorResponse(error);
  }
};