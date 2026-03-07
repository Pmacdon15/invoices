import { auth } from "@clerk/nextjs/server";
import {
  createInvoiceDb,
  deleteInvoiceDb,
  fetchingInvoiceByIdDb,
  fetchingInvoicesDb,
  updateInvoiceStatusDb,
} from "@/db/invoices";
import { CreateInvoiceSchema } from "./schema";
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

export async function createInvoiceDal(
  input: CreateInvoiceInput,
): Promise<Result<Invoice>> {
  const { orgId } = await auth.protect(); 
  if (!orgId) {
    return { data: null, error: "No org" };
  }

  const validation = CreateInvoiceSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.issues[0].message };
  }

  try {
    const data = await createInvoiceDb(input, orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("SQL Error:", e);
    return { data: null, error: "Database failed to create invoice." };
  }
}

export async function deleteInvoiceDal(id: string): Promise<Result<void>> {
  await auth.protect();
 
  try {
    await deleteInvoiceDb(id);
    return { data: undefined, error: null };
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return { data: null, error: "Failed to delete invoice." };
  }
}

export async function updateInvoiceStatusDal(
  id: string,
  status: "draft" | "sent" | "paid",
): Promise<Result<void>> {
  const { orgId } = await auth.protect();
 
 if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    await updateInvoiceStatusDb(id, status, orgId);
    return { data: undefined, error: null };
  } catch (e: unknown) {
    console.error("Database Update Error:", e);
    return { data: null, error: "Failed to update invoice status." };
  }
}
