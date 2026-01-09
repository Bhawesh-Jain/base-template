'use server'

import { ProductFormValues } from "@/app/dashboard/product-management/products/add/page";
import { ProductRepository } from "../repositories/productRepository";
import { getSession } from "../session";

export async function getProductList({}) {
  const session = await getSession();

  const repo = new ProductRepository(session.company_id);
  return await repo.getProductList({status: 0, modifier: '>'});
}

export async function getProductById(productId: string) {
  const session = await getSession();

  const repo = new ProductRepository(session.company_id);
  return await repo.getProductById({productId});
}

export async function updateProductStatus({ field, status, productId }: { field: string, status: string, productId: string }) {
  const session = await getSession();

  const repo = new ProductRepository(session.company_id);
  return await repo.updateProductStatus(field, status, productId);
}

export async function createProduct(data: ProductFormValues) {
  const session = await getSession();

  const repo = new ProductRepository(session.company_id);
  return await repo.createProduct(session.user_id, data);
}

export async function updateProduct(productId: string, data: ProductFormValues) {
  const session = await getSession();

  const repo = new ProductRepository(session.company_id);
  return await repo.updateProduct(productId, session.user_id, data);
}

export async function deleteProduct(productId: string) {
  const session = await getSession();

  const repo = new ProductRepository(session.company_id);
  return await repo.deleteProduct(productId);
}
