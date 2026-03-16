"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createProductDal, deleteProductDal } from "@/dal/products";
import type { CreateProductInput } from "@/dal/types";

export async function createProductAction(input: CreateProductInput) {
  const result = await createProductDal(input);
  if (result.error !== null) {
    return { data: null, error: result.error };
  }
  updateTag(`products-${result.data.org_id}`);
  redirect(`/products`);

  // return { data: result.data, error: null };
}

export async function deleteProductAction(id: string) {
  const result = await deleteProductDal(id);

  if (result.error !== null) {
    return { data: null, error: result.error };
  }
  updateTag(`products-${result.data.org_id}`);

  return { data: result.data, error: null };
}
