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

  const PRO_SLUG = process.env.NEXT_PUBLIC_CLERK_PRO_INVOICES_SLUG || "create_up_to_100_invoices_a_month";
  const BASIC_SLUG = process.env.NEXT_PUBLIC_CLERK_BASIC_INVOICES_SLUG || "create_up_to_10_invoices_a_month";
  const FREE_SLUG = process.env.NEXT_PUBLIC_CLERK_FREE_INVOICES_SLUG || "create_up_to_5_invoices_a_month";

  const PRO_LIMIT = parseInt(process.env.NEXT_PUBLIC_PRO_LIMIT || "100", 10);
  const BASIC_LIMIT = parseInt(process.env.NEXT_PUBLIC_BASIC_INVOICE_LIMIT || "10", 10);
  const FREE_LIMIT = parseInt(process.env.NEXT_PUBLIC_FREE_INVOICE_LIMIT || "5", 10);

  let limit = 0;
  if (has({ feature: PRO_SLUG })) {
    limit = PRO_LIMIT;
  } else if (has({ feature: BASIC_SLUG })) {
    limit = BASIC_LIMIT;
  } else if (has({ feature: FREE_SLUG })) {
    limit = FREE_LIMIT;
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
