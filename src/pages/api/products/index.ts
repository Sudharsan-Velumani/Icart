import type { APIRoute } from 'astro';
import { productContainer } from '../../../infrastructure/productContainer';
import { errorResponse, jsonResponse, parseJsonBody } from '../../../infrastructure/http/errorMapper';
import { toProductDTO } from '../../../infrastructure/http/dto';
import { requireAdmin } from '../../../infrastructure/http/requireAdmin';
import type { AddProductCommand } from '../../../application/product/AddProductUseCase';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const products = await productContainer.listProducts.execute();
    return jsonResponse(products.map(toProductDTO));
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST: APIRoute = async (context) => {
  const unauthorized = await requireAdmin(context);
  if (unauthorized) return unauthorized;

  try {
    const body = await parseJsonBody<AddProductCommand>(context.request);
    const product = await productContainer.addProduct.execute(body);
    return jsonResponse(toProductDTO(product), 201);
  } catch (error) {
    return errorResponse(error);
  }
};