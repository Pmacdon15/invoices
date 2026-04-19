import { auth } from "@clerk/nextjs/server";
import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import {
  createCustomerDb,
  deleteCustomerDb,
  fetchingCustomersDb,
  getCustomerCount,
  searchCustomersDb,
} from "@/db/customers";
import { CreateCustomerSchema, IdSchema } from "./schema";
import type {
  CreateCustomerInput,
  Customer,
  PaginatedValue,
  Result,
} from "./types";

export async function getCustomers(
  page = 1,
  all = false,
  query?: string,
): Promise<Result<PaginatedValue<Customer>>> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await fetchingCustomersDb(orgId, page, all, query);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return {
      data: null,
      error: "Database error occurred while fetching customers.",
    };
  }
}

export async function createCustomerDal(input: CreateCustomerInput) {
  const { orgId, has } = await auth.protect();

  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }

  const PRO_SLUG = process.env.NEXT_PUBLIC_CLERK_PRO_CUSTOMERS_SLUG || "create_up_to_100_customers";
  const BASIC_SLUG = process.env.NEXT_PUBLIC_CLERK_BASIC_CUSTOMERS_SLUG || "create_up_to_8_customers";
  const FREE_SLUG = process.env.NEXT_PUBLIC_CLERK_FREE_CUSTOMERS_SLUG || "create_up_to_4_customers";

  const PRO_LIMIT = parseInt(process.env.NEXT_PUBLIC_PRO_LIMIT || "100", 10);
  const BASIC_LIMIT = parseInt(process.env.NEXT_PUBLIC_BASIC_CUSTOMER_LIMIT || "8", 10);
  const FREE_LIMIT = parseInt(process.env.NEXT_PUBLIC_FREE_CUSTOMER_LIMIT || "4", 10);

  let limit = 0;
  if (has({ feature: PRO_SLUG })) {
    limit = PRO_LIMIT;
  } else if (has({ feature: BASIC_SLUG })) {
    limit = BASIC_LIMIT;
  } else if (has({ feature: FREE_SLUG })) {
    limit = FREE_LIMIT;
  }

  try {
    const currentCount = await getCustomerCount(orgId);

    if (currentCount >= limit) {
      return errAsync({
        reason: `Usage limit reached, limit: ${limit} customers total with your plan. Consider upgrading`,
      } as const);
    }
  } catch (e) {
    console.error("Error failed to verify usage limits: ", e);
    return errAsync({ reason: "Failed to verify usage limits" } as const);
  }

  const validation = CreateCustomerSchema.safeParse(input);
  if (!validation.success) {
    const errorTree = z.treeifyError(validation.error);

    return errAsync({
      reason: "Validation failed",
      errors: errorTree,
    } as const);
  }

  try {
    const customer = await createCustomerDb(input, orgId);
    return okAsync(customer);
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return errAsync({ reason: "Db failed to create customer" } as const);
  }
}

export async function deleteCustomerDal(id: string) {
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
    const data = await deleteCustomerDb(id, orgId);
    return okAsync(data);
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return errAsync({ reason: "Db failed to delete customer" } as const);
  }
}

export async function searchCustomersDal(query: string): Promise<Result<Customer[]>> {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await searchCustomersDb(orgId, query);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Search Error:", e);
    return { data: null, error: "Database error occurred." };
  }
}
