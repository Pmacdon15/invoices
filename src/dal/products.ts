import { auth } from "@clerk/nextjs/server";
import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import {
  createProductDb,
  deleteProductDb,
  fetchingProductsDb,
  getProductCount,
  searchProductsDb,
  updateProductDb,
} from "@/db/products";
import { CreateProductSchema, IdSchema, UpdateProductSchema } from "./schema";
import type {
  CreateProductInput,
  UpdateProductInput,
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

  const PRO_SLUG = process.env.NEXT_PUBLIC_CLERK_PRO_PRODUCTS_SLUG || "create_up_to_100_products";
  const BASIC_SLUG = process.env.NEXT_PUBLIC_CLERK_BASIC_PRODUCTS_SLUG || "create_up_to_10_products";
  const FREE_SLUG = process.env.NEXT_PUBLIC_CLERK_FREE_PRODUCTS_SLUG || "create_up_to_5_products";

  const PRO_LIMIT = parseInt(process.env.NEXT_PUBLIC_PRO_LIMIT || "100", 10);
  const BASIC_LIMIT = parseInt(process.env.NEXT_PUBLIC_BASIC_PRODUCT_LIMIT || "10", 10);
  const FREE_LIMIT = parseInt(process.env.NEXT_PUBLIC_FREE_PRODUCT_LIMIT || "5", 10);

  let limit = 0;
  if (has({ feature: PRO_SLUG })) {
    limit = PRO_LIMIT;
  } else if (has({ feature: BASIC_SLUG })) {
    limit = BASIC_LIMIT;
  } else if (has({ feature: FREE_SLUG })) {
    limit = FREE_LIMIT;
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

export async function updateProductDal(input: UpdateProductInput) {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }

  const validation = UpdateProductSchema.safeParse(input);
  if (!validation.success) {
    return errAsync({
      reason: "Validation failed",
      errors: z.treeifyError(validation.error),
    } as const);
  }

  try {
    const product = await updateProductDb(input, orgId);
    return okAsync(product);
  } catch (e: unknown) {
    console.error("Database Update Error:", e);
    return errAsync({ reason: "Db failed to update product" } as const);
  }
}
