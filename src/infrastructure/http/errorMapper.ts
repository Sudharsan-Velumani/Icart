import { InvalidCredentialsError } from '../../domain/auth/errors';
import { EmailAlreadyRegisteredError, InvalidUserRegistrationError } from '../../domain/user/errors';
import { InvalidProductError, ProductNotFoundError } from '../../domain/product/errors';
import {
  CartItemNotFoundError,
  InsufficientStockError,
  InvalidCartOperationError
} from '../../domain/cart/errors';

export interface ErrorResponseBody {
  error: string;
  message: string;
}

export function mapErrorToResponse(error: unknown): { status: number; body: ErrorResponseBody } {
  if (error instanceof InvalidCredentialsError) {
    return { status: 401, body: { error: error.name, message: error.message } };
  }
  if (error instanceof EmailAlreadyRegisteredError) {
    return { status: 409, body: { error: error.name, message: error.message } };
  }
  if (error instanceof InvalidUserRegistrationError) {
    return { status: 400, body: { error: error.name, message: error.message } };
  }
  if (error instanceof ProductNotFoundError || error instanceof CartItemNotFoundError) {
    return { status: 404, body: { error: error.name, message: error.message } };
  }
  if (error instanceof InsufficientStockError) {
    return { status: 409, body: { error: error.name, message: error.message } };
  }
  if (error instanceof InvalidProductError || error instanceof InvalidCartOperationError) {
    return { status: 400, body: { error: error.name, message: error.message } };
  }
  if (error instanceof SyntaxError) {
    return { status: 400, body: { error: 'InvalidJson', message: 'Request body must be valid JSON.' } };
  }
  console.error('Unhandled error in API route:', error);
  return {
    status: 500,
    body: { error: 'InternalServerError', message: 'An unexpected error occurred.' }
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function errorResponse(error: unknown): Response {
  const { status, body } = mapErrorToResponse(error);
  return jsonResponse(body, status);
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}