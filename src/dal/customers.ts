import { auth } from "@clerk/nextjs/server";
import {
  createCustomerDb,
  deleteCustomerDb,
  fetchingCustomersDb,
} from "@/db/customers";
import { CreateCustomerSchema } from "./schema";
import type { CreateCustomerInput, Customer, Result } from "./types";

export async function getCustomers(): Promise<Result<Customer[]>> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await fetchingCustomersDb(orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return {
      data: null,
      error: "Database error occurred while fetching customers.",
    };
  }
}

export async function createCustomerDal(
  input: CreateCustomerInput,
): Promise<Result<Customer>> {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return { data: null, error: "No org" };
  }

  const validation = CreateCustomerSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.issues[0].message };
  }

  try {
    const data = await createCustomerDb(input, orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return {
      data: null,
      error: "Failed to create customer. Please try again.",
    };
  }
}

export async function deleteCustomerDal(id: string): Promise<Result<void>> {
  await auth.protect();
  try {
    await deleteCustomerDb(id);
    return { data: undefined, error: null };
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return { data: null, error: "Database Error" };
  }
}
