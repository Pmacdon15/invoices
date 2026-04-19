import { auth, clerkClient } from "@clerk/nextjs/server";
import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import {
  createInvoiceDb,
  deleteInvoiceDb,
  fetchingInvoiceByIdDb,
  fetchingInvoicesDb,
  getMonthlyInvoiceCount,
  searchInvoicesDb,
  sendInvoiceDb,
  updateInvoiceStatusDb,
} from "@/db/invoices";
import {
  CreateInvoiceSchema,
  IdSchema,
  UpdateInvoiceStatusSchema,
} from "./schema";
import type {
  CreateInvoiceInput,
  FullInvoice,
  Invoice,
  PaginatedValue,
  Result,
} from "./types";

export async function getInvoices(
  page: number,
  query?: string,
): Promise<Result<PaginatedValue<Invoice>>> {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return { data: null, error: "No org" };
  }

  try {
    const data = await fetchingInvoicesDb(orgId, page, query);
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
  const { orgId, has } = await auth.protect();

  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }

  let limit = 0;
  if (has({ feature: "create_unlimited_invoices_a_month" })) {
    limit = Infinity;
  } else if (has({ feature: "create_up_to_10_invoices_a_month" })) {
    limit = 10;
  } else if (has({ feature: "create_up_to_5_invoices_a_month" })) {
    limit = 5;
  }

  try {
    const currentCount = await getMonthlyInvoiceCount(orgId);

    if (currentCount >= limit) {
      return errAsync({
        reason: `Usage limit reached, limit: ${limit} a month with your plan. Consider upgrading`,
      } as const);
    }
  } catch (e) {
    console.error("Error failed to verify usage limits: ", e)
    return errAsync({ reason: "Failed to verify usage limits" } as const);
  }

  const validation = CreateInvoiceSchema.safeParse(input);
  if (!validation.success) {
    return errAsync({
      reason: "Validation failed",
      errors: z.treeifyError(validation.error),
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

export async function sendInvoiceDal(id: string) {
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

  // Fetch org name from Clerk
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  const orgName = org.name;

  try {
    const invoice = await sendInvoiceDb(id, orgId, orgName);
    return okAsync(invoice);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Send Invoice Error:", e);
    return errAsync({ reason: "Failed to send invoice", message } as const);
  }
}

export async function searchInvoicesDal(
  query: string,
): Promise<Result<Invoice[]>> {
  const { orgId } = await auth.protect();
  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await searchInvoicesDb(orgId, query);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Search Error:", e);
    return { data: null, error: "Database error occurred." };
  }
}
