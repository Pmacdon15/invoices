"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProductDal, deleteProductDal } from "@/dal/products";
import type { CreateProductInput } from "@/dal/types";

export async function createProductAction(input: CreateProductInput) {
  const result = await createProductDal(input);
  if (result.error) return result;

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProductAction(id: string) {
  const result = await deleteProductDal(id);
  if (result.error) return result;

  revalidatePath("/products");
  return { data: true, error: null };
}
