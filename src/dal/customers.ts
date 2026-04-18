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

  let limit = 0;
  if (has({ feature: "create_unlimited_customers" })) {
    limit = Infinity;
  } else if (has({ feature: "create_up_to_8_customers" })) {
    limit = 8;
  } else if (has({ feature: "create_up_to_4_customers" })) {
    limit = 4;
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
