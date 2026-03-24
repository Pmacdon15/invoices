import { auth } from "@clerk/nextjs/server";
import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import {
  createInvoiceDb,
  deleteInvoiceDb,
  fetchingInvoiceByIdDb,
  fetchingInvoicesDb,
  updateInvoiceStatusDb,
} from "@/db/invoices";
import {
  CreateInvoiceSchema,
  IdSchema,
  UpdateInvoiceStatusSchema,
} from "./schema";
import type { CreateInvoiceInput, FullInvoice, Invoice, Result } from "./types";

export async function getInvoices(): Promise<Result<Invoice[]>> {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return { data: null, error: "No org" };
  }

  try {
    const data = await fetchingInvoicesDb(orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Database error occurred." };
  }
}

export async function getInvoiceById(id: string): Promise<Result<FullInvoice>> {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await fetchingInvoiceByIdDb(id, orgId);
    if (!data) return { data: null, error: "Invoice not found" };
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Failed to fetch invoice." };
  }
}

export async function createInvoiceDal(input: CreateInvoiceInput) {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }

  const validation = CreateInvoiceSchema.safeParse(input);
  if (!validation.success) {
    const errorTree = z.treeifyError(validation.error);

    return errAsync({
      reason: "Validation failed",
      errors: errorTree,
    } as const);
  }
  try {
    const invoice = await createInvoiceDb(input, orgId);

    return okAsync(invoice);
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return errAsync({ reason: "Db failed to create invoice" } as const);
  }
}

export async function deleteInvoiceDal(id: string) {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }

  const validation = IdSchema.safeParse({ id });
  if (!validation.success) {
    const errorTree = z.treeifyError(validation.error);
    return errAsync({
      reason: "Validation failed",
      errors: errorTree,
    } as const);
  }

  try {
    const data = await deleteInvoiceDb(id, orgId);
    return okAsync(data);
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return errAsync({ reason: "Db failed to delete invoice" } as const);
  }
}

export async function updateInvoiceStatusDal(
  id: string,
  status: "draft" | "sent" | "paid",
) {
  const { orgId } = await auth.protect();

  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }

  const validation = UpdateInvoiceStatusSchema.safeParse({ id, status });
  if (!validation.success) {
    const errorTree = z.treeifyError(validation.error);
    return errAsync({
      reason: "Validation failed",
      errors: errorTree,
    } as const);
  }

  try {
    const invoice = await updateInvoiceStatusDb(id, status, orgId);
    return okAsync(invoice);
  } catch (e: unknown) {
    console.error("Database Update Error:", e);
    return errAsync({ reason: "Db failed to update invoice" } as const);
  }
}
