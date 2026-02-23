"use server";

import { createCustomerDal, deleteCustomerDal } from "@/dal/customers";
import type { CreateCustomerInput } from "@/dal/types";

export async function createCustomerAction(input: CreateCustomerInput) {
  return await createCustomerDal(input);
}

export async function deleteCustomerAction(id: string) {
  return await deleteCustomerDal(id);
}
