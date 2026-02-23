"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProductDal } from "@/dal/products";
import type { CreateProductInput } from "@/dal/types";

export async function createProductAction(input: CreateProductInput) {
  // Ensure price is a number
  const data = {
    ...input,
    price: Number(input.price),
  };
  await createProductDal(data);
  revalidatePath("/products");
  redirect("/products");
}
