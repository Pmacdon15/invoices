"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createCustomerDal, deleteCustomerDal } from "@/dal/customers";
import type { CreateCustomerInput } from "@/dal/types";

export async function createCustomerAction(input: CreateCustomerInput) {
  const result = await createCustomerDal(input);
  if (result.error !== null) {
    return { data: null, error: result.error };
  }
  updateTag(`customers-${result.data.org_id}`);
  redirect(`/customers`);

  // return { data: result.data, error: null };
}

export async function deleteCustomerAction(id: string) {
  const result = await deleteCustomerDal(id);

  if (result.error !== null) {
    return { data: null, error: result.error };
  }
  updateTag(`customers-${result.data.org_id}`);

  return { data: result.data, error: null };
}
