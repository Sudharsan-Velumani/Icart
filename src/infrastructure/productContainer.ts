import { PostgresProductRepository } from './repositories/PostgresProductRepository';
import { AddProductUseCase } from '../application/product/AddProductUseCase';
import { UpdateProductUseCase } from '../application/product/UpdateProductUseCase';
import { DeleteProductUseCase } from '../application/product/DeleteProductUseCase';
import { GetProductUseCase, ListProductsUseCase } from '../application/product/GetProductUseCase';

const productRepository = new PostgresProductRepository();

export const productContainer = {
  addProduct: new AddProductUseCase(productRepository),
  updateProduct: new UpdateProductUseCase(productRepository),
  deleteProduct: new DeleteProductUseCase(productRepository),
  getProduct: new GetProductUseCase(productRepository),
  listProducts: new ListProductsUseCase(productRepository)
};