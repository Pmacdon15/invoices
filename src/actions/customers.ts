"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCustomerDal, deleteCustomerDal } from "@/dal/customers";
import type { CreateCustomerInput } from "@/dal/types";

export async function createCustomerAction(input: CreateCustomerInput) {
  const result = await createCustomerDal(input);
  if (result.error) return result;

  revalidatePath("/customers");
  redirect("/customers");
}

export async function deleteCustomerAction(id: string) {
  const result = await deleteCustomerDal(id);
  if (result.error) return result;

  revalidatePath("/customers");
  return { data: true, error: null };
}
