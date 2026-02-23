"use server";

import { createProductDal, deleteProductDal } from "@/dal/products";
import type { CreateProductInput } from "@/dal/types";

export async function createProductAction(input: CreateProductInput) {
  return await createProductDal(input);
}

export async function deleteProductAction(id: string) {
  return await deleteProductDal(id);
}
