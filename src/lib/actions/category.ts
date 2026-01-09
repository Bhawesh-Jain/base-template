'use server'

import { CategoryFormValues } from "@/app/dashboard/category-management/categories/add/page";
import { CategoryRepository } from "../repositories/categoryRepository";
import { getSession } from "../session";

export async function getCategoryList({ }) {
  const session = await getSession();

  const repo = new CategoryRepository(session.company_id);
  return await repo.getCategoryList({});
}

export async function updateCategoryStatus({ field, status, categoryId }: { field: string, status: string, categoryId: string }) {
  const session = await getSession();

  const repo = new CategoryRepository(session.company_id);
  return await repo.getCategoryList({});
}

export async function createCategory(data: CategoryFormValues) {
  const session = await getSession();

  const repo = new CategoryRepository(session.company_id);
  return await repo.createCategory(session.user_id, data);
}
