import { auth } from "@clerk/nextjs/server";
import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import {
  createProductDb,
  deleteProductDb,
  fetchingProductsDb,
  getProductCount,
  searchProductsDb,
} from "@/db/products";
import { CreateProductSchema, IdSchema } from "./schema";
import type {
  CreateProductInput,
  PaginatedValue,
  Product,
  Result,
} from "./types";
export async function getProducts(
  page = 1,
  all = false,
  query?: string,
): Promise<Result<PaginatedValue<Product>>> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await fetchingProductsDb(orgId, page, all, query);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Database error occurred." };
  }
}

export async function createProductDal(input: CreateProductInput) {
  const { orgId, has } = await auth.protect();

  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }

  let limit = 0;
  if (has({ feature: "create_unlimited_products" })) {
    limit = Infinity;
  } else if (has({ feature: "create_up_to_10_products" })) {
    limit = 10;
  } else if (has({ feature: "create_up_to_5_products" })) {
    limit = 5;
  }

  try {
    const currentCount = await getProductCount(orgId);

    if (currentCount >= limit) {
      return errAsync({
        reason: `Usage limit reached, limit: ${limit} products total with your plan. Consider upgrading`,
      } as const);
    }
  } catch (e) {
    console.error("Error failed to verify usage limits: ", e);
    return errAsync({ reason: "Failed to verify usage limits" } as const);
  }

  const validation = CreateProductSchema.safeParse(input);
  if (!validation.success) {
    const errorTree = z.treeifyError(validation.error);

    return errAsync({
      reason: "Validation failed",
      errors: errorTree,
    } as const);
  }

  try {
    const product = await createProductDb(input, orgId);
    return okAsync(product);
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return errAsync({ reason: "Db failed to create product" } as const);
  }
}

export async function deleteProductDal(id: string) {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }

  const validation = IdSchema.safeParse({ id });
  if (!validation.success) {
    const errorTree = z.treeifyError(validation.error);
    return errAsync({
      reason: "Validation failed",
      errors: errorTree,
    } as const);
  }

  try {
    const data = await deleteProductDb(id, orgId);
    return okAsync(data);
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return errAsync({ reason: "Db failed to delete product" } as const);
  }
}

export async function searchProductsDal(query: string): Promise<Result<Product[]>> {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await searchProductsDb(orgId, query);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Search Error:", e);
    return { data: null, error: "Database error occurred." };
  }
}
