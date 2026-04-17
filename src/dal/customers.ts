import { auth } from "@clerk/nextjs/server";
import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import {
  createCustomerDb,
  deleteCustomerDb,
  fetchingCustomersDb,
} from "@/db/customers";
import { CreateCustomerSchema, IdSchema } from "./schema";
import type {
  CreateCustomerInput,
  Customer,
  PaginatedValue,
  Result,
} from "./types";

export async function getCustomers(
  page=1,
): Promise<Result<PaginatedValue<Customer>>> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await fetchingCustomersDb(orgId, page);
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
  const { orgId } = await auth.protect();

  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
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
