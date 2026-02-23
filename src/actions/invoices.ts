"use server";

import { createInvoiceDal, deleteInvoiceDal } from "@/dal/invoices";
import type { CreateInvoiceInput } from "@/dal/types";

export async function createInvoiceAction(input: CreateInvoiceInput) {
  return await createInvoiceDal(input);
}

export async function deleteInvoiceAction(id: string) {
  return await deleteInvoiceDal(id);
}
