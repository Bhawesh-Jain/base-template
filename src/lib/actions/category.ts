'use server'

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
