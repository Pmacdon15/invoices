"use server";

import {
  createInvoiceDal,
  deleteInvoiceDal,
  updateInvoiceStatusDal,
} from "@/dal/invoices";
import type { CreateInvoiceInput } from "@/dal/types";

export async function createInvoiceAction(input: CreateInvoiceInput) {
  return await createInvoiceDal(input);
}

export async function deleteInvoiceAction(id: string) {
  return await deleteInvoiceDal(id);
}

export async function updateInvoiceStatusAction(
  id: string,
  status: "draft" | "sent" | "paid",
) {
  return await updateInvoiceStatusDal(id, status);
}
