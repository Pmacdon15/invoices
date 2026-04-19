"use server";

import { updateTag } from "next/cache";
import { createProductDal, deleteProductDal, updateProductDal } from "@/dal/products";
import type { CreateProductInput, UpdateProductInput } from "@/dal/types";
import { handleMutationError } from "./utils";

export async function createProductAction(input: CreateProductInput) {
  const result = await createProductDal(input);
  return result.match(
    (data) => {
      updateTag(`products-${data.org_id}`);
      // redirect(`/products`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}
export async function deleteProductAction(id: string) {
  const result = await deleteProductDal(id);

  return result.match(
    (data) => {
      updateTag(`products-${data.org_id}`);
      // redirect(`/products`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}

export async function updateProductAction(input: UpdateProductInput) {
  const result = await updateProductDal(input);

  return result.match(
    (data) => {
      updateTag(`products-${data.org_id}`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}
