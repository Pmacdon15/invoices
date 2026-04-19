"use server";

import { updateTag } from "next/cache";
import {
  createInvoiceDal,
  deleteInvoiceDal,
  sendInvoiceDal,
  updateInvoiceDal,
  updateInvoiceStatusDal,
} from "@/dal/invoices";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "@/dal/types";
import { handleMutationError } from "./utils";

export async function createInvoiceAction(input: CreateInvoiceInput) {
  const result = await createInvoiceDal(input);

  return result.match(
    (data) => {
      updateTag(`invoices-${data.org_id}`);
      // redirect(`/products`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}

export async function deleteInvoiceAction(id: string) {
  const result = await deleteInvoiceDal(id);
  return result.match(
    (data) => {
      updateTag(`invoices-${data.org_id}`);
      updateTag(`invoice-${data.id}`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}

export async function updateInvoiceStatusAction(
  id: string,
  status: "draft" | "sent" | "paid",
) {
  const result = await updateInvoiceStatusDal(id, status);

  return result.match(
    (data) => {
      updateTag(`invoices-${data.org_id}`);
      updateTag(`invoice-${data.id}`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}

export async function sendInvoiceAction(invoiceId: string) {
  const result = await sendInvoiceDal(invoiceId);

  return result.match(
    (data) => {
      updateTag(`invoices-${data.org_id}`);
      updateTag(`invoice-${data.id}`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}

export async function updateInvoiceAction(input: UpdateInvoiceInput) {
  const result = await updateInvoiceDal(input);

  return result.match(
    (data) => {
      updateTag(`invoices-${data.org_id}`);
      updateTag(`invoice-${data.id}`);
      return { data };
    },
    (err) => {
      return handleMutationError(err);
    },
  );
}
