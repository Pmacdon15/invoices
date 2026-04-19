"use server";

import { updateTag } from "next/cache";
import { createCustomerDal, deleteCustomerDal, updateCustomerDal } from "@/dal/customers";
import type { CreateCustomerInput, UpdateCustomerInput } from "@/dal/types";
import { handleMutationError } from "./utils";

export async function createCustomerAction(input: CreateCustomerInput) {
  const result = await createCustomerDal(input);
  return result.match(
    (data) => {
      updateTag(`customers-${data.org_id}`);
      // redirect(`/products`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}

export async function deleteCustomerAction(id: string) {
  const result = await deleteCustomerDal(id);

  return result.match(
    (data) => {
      updateTag(`customers-${data.org_id}`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}

export async function updateCustomerAction(input: UpdateCustomerInput) {
  const result = await updateCustomerDal(input);

  return result.match(
    (data) => {
      updateTag(`customers-${data.org_id}`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}
