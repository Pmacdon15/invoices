"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createInvoiceDal } from "@/dal/invoices";
import type { CreateInvoiceInput } from "@/dal/types";

export async function createInvoiceAction(input: CreateInvoiceInput) {
  await createInvoiceDal(input);
  revalidatePath("/invoices");
  redirect("/invoices");
}
