"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  createInvoiceDal,
  deleteInvoiceDal,
  updateInvoiceStatusDal,
} from "@/dal/invoices";
import type { CreateInvoiceInput, Invoice, Result } from "@/dal/types";

export async function createInvoiceAction(
  input: CreateInvoiceInput,
): Promise<Result<Invoice>> {
  const result = await createInvoiceDal(input);
  if (result.error !== null) {
    return { data: null, error: result.error };
  }
  updateTag(`invoices-${result.data.org_id}`);
  redirect(`/invoices/${result.data.id}`);

  // return { data: result.data, error: null };
}

export async function deleteInvoiceAction(id: string) {
  const result = await deleteInvoiceDal(id);

  if (result.error !== null) {
    return { data: null, error: result.error };
  }
  updateTag(`invoices-${result.data.org_id}`);
  updateTag(`invoice-${result.data.id}`);
  return { data: result.data, error: null };
}

export async function updateInvoiceStatusAction(
  id: string,
  status: "draft" | "sent" | "paid",
) {
  const result = await await updateInvoiceStatusDal(id, status);

  if (result.error !== null) {
    return { data: null, error: result.error };
  }
  updateTag(`invoices-${result.data.org_id}`);
  updateTag(`invoice-${result.data.id}`);
  return { data: result.data, error: null };
}
