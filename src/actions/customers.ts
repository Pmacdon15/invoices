"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCustomerDal } from "@/dal/customers";
import type { CreateCustomerInput } from "@/dal/types";

export async function createCustomerAction(input: CreateCustomerInput) {
  await createCustomerDal(input);
  revalidatePath("/customers");
  redirect("/customers");
}
