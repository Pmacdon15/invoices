"use server";

import { updateTag } from "next/cache";
import { updateInvoicePrefixDal } from "@/dal/org-settings";
import { handleMutationError } from "./utils";

export async function updateInvoicePrefixAction(prefix: string) {
  const result = await updateInvoicePrefixDal(prefix);
  return result.match(
    (data) => {
      updateTag(`org-settings-${data.org_id}`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}
