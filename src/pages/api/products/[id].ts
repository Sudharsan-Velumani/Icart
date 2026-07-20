import type { APIRoute } from 'astro';
import { productContainer } from '../../../infrastructure/productContainer';
import { errorResponse, jsonResponse, parseJsonBody } from '../../../infrastructure/http/errorMapper';
import { toProductDTO } from '../../../infrastructure/http/dto';
import { requireAdmin } from '../../../infrastructure/http/requireAdmin';
import type { UpdateProductInput } from '../../../domain/product/Product';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const product = await productContainer.getProduct.execute(params.id as string);
    return jsonResponse(toProductDTO(product));
  } catch (error) {
    return errorResponse(error);
  }
};

export const PUT: APIRoute = async (context) => {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  try {
    const body = await parseJsonBody<UpdateProductInput>(context.request);
    const product = await productContainer.updateProduct.execute({
      id: context.params.id as string,
      ...body
    });
    return jsonResponse(toProductDTO(product));
  } catch (error) {
    return errorResponse(error);
  }
};

export const DELETE: APIRoute = async (context) => {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  try {
    await productContainer.deleteProduct.execute(context.params.id as string);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
};