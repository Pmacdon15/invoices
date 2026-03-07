import { auth } from "@clerk/nextjs/server";
import {
  createProductDb,
  deleteProductDb,
  fetchingProductsDb,
} from "@/db/products";
import { CreateProductSchema } from "./schema";
import type { CreateProductInput, Product, Result } from "./types";

export async function getProducts(): Promise<Result<Product[]>> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await fetchingProductsDb(orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Database error occurred." };
  }
}

export async function createProductDal(
  input: CreateProductInput,
): Promise<Result<Product>> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return { data: null, error: "No org" };
  }

  const validation = CreateProductSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.message };
  }

  try {
    const data = await createProductDb(input, orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return { data: null, error: "Failed to create product. Please try again." };
  }
}

export async function deleteProductDal(id: string): Promise<Result<void>> {
  await auth.protect();
  try {
    await deleteProductDb(id);
    return { data: undefined, error: null };
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return { data: null, error: "Failed to delete product." };
  }
}
