"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createInvoiceDal, deleteInvoiceDal } from "@/dal/invoices";
import type { CreateInvoiceInput } from "@/dal/types";

export async function createInvoiceAction(input: CreateInvoiceInput) {
  const result = await createInvoiceDal(input);
  if (result.error) return result;

  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function deleteInvoiceAction(id: string) {
  const result = await deleteInvoiceDal(id);
  if (result.error) return result;

  revalidatePath("/invoices");
  return { data: true, error: null };
}
