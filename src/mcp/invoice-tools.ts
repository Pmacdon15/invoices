import { z } from "zod";
import {
  createInvoiceDal,
  deleteInvoiceDal,
  getInvoiceById,
  getInvoicePdfDal,
  getInvoices,
  sendInvoiceDal,
  updateInvoiceDal,
  updateInvoiceStatusDal,
} from "@/dal/invoices";
import { getProductByIdDal } from "@/dal/products";
import type { CreateInvoiceInput, FullInvoice, Invoice } from "@/dal/types";
import { calculateInvoiceTotals, lineItemName } from "@/lib/invoice-totals";
import { isOverdue } from "@/lib/overdue";
import type { CallerContext } from "@/mcp/caller";
import {
  createCustomer,
  customerContactFields,
  customerView,
  orgIdField,
} from "@/mcp/catalog-tools";
import {
  dalFailure,
  failure,
  invalidate,
  money,
  type ToolResult,
} from "@/mcp/results";

/*
 * Invoice tools: list, read, create, edit, change status, delete, send and
 * download, through the same data layer (plan limits, org scoping, the
 * send_email feature) as the Invoices pages. The read and write tools return
 * the whole invoice, which the invoice card (src/mcp/apps.ts) renders.
 */

export const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
  "https://www.invoicepro.patmac.ca";

export const SEND_EMAIL_FEATURE = "send_email";

const STATUSES = ["draft", "sent", "paid"] as const;
type Status = (typeof STATUSES)[number];

const invoiceIdField = z
  .string()
  .describe("The invoice's ID (from list_invoices or create_invoice).");

const confirmField = (what: string) =>
  z
    .boolean()
    .optional()
    .describe(
      `Pass true only after the user has agreed to ${what}. Without it nothing happens and you get a preview to show them.`,
    );

const lineItemInput = z.object({
  product_id: z
    .string()
    .optional()
    .describe(
      "A catalog product's ID (from list_products). Leave out for a one-off item.",
    ),
  description: z
    .string()
    .max(500)
    .optional()
    .describe(
      "What a one-off item is, e.g. 'Emergency call-out'. Required when there's no product_id.",
    ),
  quantity: z.number().int().min(1).optional().describe("Defaults to 1."),
  unit_price: z
    .number()
    .min(0)
    .optional()
    .describe(
      "Unit price in dollars. Defaults to the product's current price; required for a one-off item.",
    ),
});

type LineItemInput = z.infer<typeof lineItemInput>;

const totalOverrideField = z
  .number()
  .min(0)
  .nullable()
  .optional()
  .describe(
    "A manual total in dollars that replaces the computed one (line items plus tax). null goes back to the computed total.",
  );

/** An invoice as tools (and the invoice card) see it. */
export function invoiceView(invoice: FullInvoice) {
  const items = invoice.items.map((item) => ({
    product_id: item.product_id ?? null,
    description: item.description ?? null,
    name: lineItemName(item),
    one_off: !item.product_id,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    amount: Number(item.quantity) * Number(item.unit_price),
  }));
  const taxRate = Number(invoice.tax_rate ?? 0);
  const totals = calculateInvoiceTotals(items, taxRate);
  const override =
    invoice.total_override === null || invoice.total_override === undefined
      ? null
      : Number(invoice.total_override);
  return {
    invoice_id: invoice.id,
    status: invoice.status,
    created_at: new Date(invoice.created_at).toISOString(),
    customer: customerView(invoice.customer),
    items,
    tax_rate: taxRate,
    subtotal: totals.subtotal,
    tax: totals.tax,
    computed_total: totals.total,
    total_override: override,
    total: Number(invoice.total),
    // Sent and past its due date; status stays "sent".
    overdue: isOverdue(invoice),
    app_url: `${APP_ORIGIN}/invoices/${invoice.id}`,
  };
}

function oneLine(invoice: ReturnType<typeof invoiceView>) {
  const status = invoice.overdue ? "overdue" : invoice.status;
  return `${money.format(invoice.total)} to ${invoice.customer.name} (${status})`;
}

/** The whole invoice for the card, read fresh after any change. */
async function invoiceResult(
  ctx: CallerContext,
  invoiceId: string,
  summary: (invoice: ReturnType<typeof invoiceView>) => string,
  extra: Record<string, unknown> = {},
): Promise<ToolResult> {
  const result = await getInvoiceById(invoiceId, ctx, true);
  if (result.error !== null) return failure(result.error);
  const invoice = invoiceView(result.data);
  return {
    summary: summary(invoice),
    data: {
      ...extra,
      invoice,
      organization: { org_id: ctx.orgId, name: ctx.org.name },
      can_send: ctx.has({ feature: SEND_EMAIL_FEATURE }),
    },
  };
}

/**
 * The line items as the data layer takes them: catalog items get the
 * product's current price unless one is given; one-off items need a
 * description and a price.
 */
async function resolveItems(
  ctx: CallerContext,
  items: LineItemInput[],
): Promise<
  | { ok: true; items: CreateInvoiceInput["items"] }
  | { ok: false; error: string }
> {
  const resolved: CreateInvoiceInput["items"] = [];
  for (const [index, item] of items.entries()) {
    const n = index + 1;
    const quantity = item.quantity ?? 1;
    const description = item.description?.trim() || null;
    if (item.product_id) {
      let unitPrice = item.unit_price;
      if (unitPrice === undefined) {
        const product = await getProductByIdDal(item.product_id, ctx);
        if (product.error !== null) {
          return {
            ok: false,
            error: `Item ${n}: ${product.error}. Check the product_id with list_products.`,
          };
        }
        unitPrice = Number(product.data.price);
      }
      resolved.push({
        product_id: item.product_id,
        description,
        quantity,
        unit_price: unitPrice,
      });
    } else {
      if (!description) {
        return {
          ok: false,
          error: `Item ${n} needs a product_id, or a description for a one-off item.`,
        };
      }
      if (item.unit_price === undefined) {
        return {
          ok: false,
          error: `Item ${n} ("${description}") is a one-off item, so it needs a unit_price.`,
        };
      }
      resolved.push({
        product_id: null,
        description,
        quantity,
        unit_price: item.unit_price,
      });
    }
  }
  return { ok: true, items: resolved };
}

// ---------- reads ----------

export const listInvoicesInputSchema = z.object({
  org_id: orgIdField,
  query: z
    .string()
    .max(200)
    .optional()
    .describe(
      "Search by customer name or email, invoice ID, total or date (YYYY-MM-DD).",
    ),
  status: z
    .enum(STATUSES)
    .optional()
    .describe(
      "Only invoices with this status, e.g. 'sent' for unpaid ones (overdue invoices are sent ones with overdue: true).",
    ),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Page of results, 10 per page, newest first. Defaults to 1."),
});

export async function listInvoicesTool(
  ctx: CallerContext,
  args: z.infer<typeof listInvoicesInputSchema>,
): Promise<ToolResult> {
  const page = args.page ?? 1;
  const result = await getInvoices(
    page,
    args.query || undefined,
    ctx,
    args.status,
  );
  if (result.error !== null) return failure(result.error);
  const invoices = result.data.data.map((invoice: Invoice) => ({
    invoice_id: invoice.id,
    customer_name: invoice.customer?.name ?? null,
    customer_email: invoice.customer?.email ?? null,
    status: invoice.status,
    total: Number(invoice.total),
    overdue: isOverdue(invoice),
    created_at: new Date(invoice.created_at).toISOString(),
  }));
  return {
    summary:
      result.data.totalCount === 0
        ? "No invoices match."
        : `${result.data.totalCount} invoice(s); page ${page} of ${result.data.totalPages}.`,
    data: {
      invoices,
      page,
      total_pages: result.data.totalPages,
      total_count: result.data.totalCount,
    },
  };
}

export const getInvoiceInputSchema = z.object({
  org_id: orgIdField,
  invoice_id: invoiceIdField,
});

export async function getInvoiceTool(
  ctx: CallerContext,
  args: z.infer<typeof getInvoiceInputSchema>,
): Promise<ToolResult> {
  return invoiceResult(
    ctx,
    args.invoice_id,
    (invoice) => `Invoice ${invoice.invoice_id}: ${oneLine(invoice)}.`,
  );
}

// ---------- create / update ----------

const newCustomerInput = z
  .object({
    name: z.string().min(2).max(200).describe("Customer or company name."),
    email: z.string().max(320).describe("Email address invoices are sent to."),
    ...customerContactFields,
  })
  .describe(
    "A customer who isn't saved yet: they're added to the customer list, then invoiced. Only after the user agreed to add them.",
  );

export const createInvoiceInputSchema = z.object({
  org_id: orgIdField,
  customer_id: z
    .string()
    .optional()
    .describe("An existing customer's ID (from list_customers)."),
  new_customer: newCustomerInput.optional(),
  items: z
    .array(lineItemInput)
    .min(1)
    .describe("The line items: catalog products and/or one-off items."),
  tax_rate: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Tax percentage, e.g. 5 for 5%. Defaults to 0."),
  status: z
    .enum(STATUSES)
    .optional()
    .describe(
      "Defaults to 'draft'. Setting 'sent' doesn't email it; use send_invoice for that.",
    ),
  total_override: totalOverrideField,
});

export async function createInvoiceTool(
  ctx: CallerContext,
  args: z.infer<typeof createInvoiceInputSchema>,
): Promise<ToolResult> {
  if (!args.customer_id && !args.new_customer) {
    return failure(
      "Say who the invoice is for: a customer_id from list_customers, or new_customer for someone not saved yet.",
    );
  }
  if (args.customer_id && args.new_customer) {
    return failure("Pass customer_id or new_customer, not both.");
  }

  const items = await resolveItems(ctx, args.items);
  if (!items.ok) return failure(items.error);

  let customerId = args.customer_id;
  let createdCustomer: string | null = null;
  if (args.new_customer) {
    const created = await createCustomer(ctx, args.new_customer);
    if (created.isErr()) return dalFailure(created.error);
    customerId = created.value.id;
    createdCustomer = created.value.name;
  }

  const result = await createInvoiceDal(
    {
      customer_id: customerId as string,
      items: items.items,
      tax_rate: args.tax_rate ?? 0,
      status: args.status ?? "draft",
      total_override: args.total_override ?? null,
    },
    ctx,
  );
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["invoices", "stats"], result.value.id);

  return invoiceResult(
    ctx,
    result.value.id,
    (invoice) =>
      `${createdCustomer ? `Added customer ${createdCustomer} and created` : "Created"} invoice ${invoice.invoice_id}: ${oneLine(invoice)}. It hasn't been emailed; use send_invoice when the user wants it sent.`,
  );
}

export const updateInvoiceInputSchema = z.object({
  org_id: orgIdField,
  invoice_id: invoiceIdField,
  customer_id: z
    .string()
    .optional()
    .describe("Bill a different existing customer."),
  items: z
    .array(lineItemInput)
    .min(1)
    .optional()
    .describe(
      "The complete new list of line items (replaces all of them). Leave out to keep the items.",
    ),
  tax_rate: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("New tax percentage."),
  status: z
    .enum(STATUSES)
    .optional()
    .describe("New status. Setting 'sent' doesn't email it."),
  total_override: totalOverrideField,
});

export async function updateInvoiceTool(
  ctx: CallerContext,
  args: z.infer<typeof updateInvoiceInputSchema>,
): Promise<ToolResult> {
  const current = await getInvoiceById(args.invoice_id, ctx, true);
  if (current.error !== null) return failure(current.error);
  const invoice = current.data;

  let items: CreateInvoiceInput["items"] = invoice.items.map((item) => ({
    product_id: item.product_id ?? null,
    description: item.description ?? null,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
  }));
  if (args.items) {
    const resolved = await resolveItems(ctx, args.items);
    if (!resolved.ok) return failure(resolved.error);
    items = resolved.items;
  }

  const result = await updateInvoiceDal(
    {
      id: invoice.id,
      customer_id: args.customer_id ?? invoice.customer_id,
      items,
      tax_rate: args.tax_rate ?? Number(invoice.tax_rate ?? 0),
      status: args.status ?? invoice.status,
      total_override:
        args.total_override === undefined
          ? (invoice.total_override ?? null)
          : args.total_override,
    },
    ctx,
  );
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["invoices", "stats"], invoice.id);

  return invoiceResult(
    ctx,
    invoice.id,
    (updated) => `Updated invoice ${updated.invoice_id}: ${oneLine(updated)}.`,
  );
}

export const updateInvoiceStatusInputSchema = z.object({
  org_id: orgIdField,
  invoice_id: invoiceIdField,
  status: z
    .enum(STATUSES)
    .describe(
      "'draft', 'sent' or 'paid'. Setting 'sent' doesn't email it; use send_invoice for that.",
    ),
});

export async function updateInvoiceStatusTool(
  ctx: CallerContext,
  args: z.infer<typeof updateInvoiceStatusInputSchema>,
): Promise<ToolResult> {
  const result = await updateInvoiceStatusDal(
    args.invoice_id,
    args.status as Status,
    ctx,
  );
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["invoices", "stats"], args.invoice_id);
  return invoiceResult(
    ctx,
    args.invoice_id,
    (invoice) => `Invoice ${invoice.invoice_id} is now ${invoice.status}.`,
  );
}

// ---------- delete / send / pdf ----------

export const deleteInvoiceInputSchema = z.object({
  org_id: orgIdField,
  invoice_id: invoiceIdField,
  confirm: confirmField("permanently delete this invoice"),
});

export async function deleteInvoiceTool(
  ctx: CallerContext,
  args: z.infer<typeof deleteInvoiceInputSchema>,
): Promise<ToolResult> {
  const current = await getInvoiceById(args.invoice_id, ctx, true);
  if (current.error !== null) return failure(current.error);
  const invoice = invoiceView(current.data);
  if (!args.confirm) {
    return {
      summary: `Permanently delete invoice ${invoice.invoice_id} (${oneLine(invoice)})? This can't be undone. Ask the user, then call delete_invoice again with confirm: true.`,
      data: { status: "needs_confirmation", invoice },
    };
  }
  const result = await deleteInvoiceDal(args.invoice_id, ctx);
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["invoices", "stats"], args.invoice_id);
  return {
    summary: `Deleted invoice ${invoice.invoice_id}.`,
    data: { status: "deleted", invoice_id: invoice.invoice_id },
  };
}

export const sendInvoiceInputSchema = z.object({
  org_id: orgIdField,
  invoice_id: invoiceIdField,
  confirm: confirmField("email this invoice to the customer"),
});

export async function sendInvoiceTool(
  ctx: CallerContext,
  args: z.infer<typeof sendInvoiceInputSchema>,
): Promise<ToolResult> {
  if (!ctx.has({ feature: SEND_EMAIL_FEATURE })) {
    return failure(
      `${ctx.org.name}'s plan doesn't include emailing invoices. Upgrade on the Plans page, or download the PDF with get_invoice_pdf and send it yourself.`,
      { status: "send_email_not_in_plan" },
    );
  }
  const current = await getInvoiceById(args.invoice_id, ctx, true);
  if (current.error !== null) return failure(current.error);
  const invoice = invoiceView(current.data);

  if (!args.confirm) {
    const again =
      invoice.status === "draft"
        ? ""
        : ` It's already marked ${invoice.status}, so this emails it again.`;
    return {
      summary: `Email invoice ${invoice.invoice_id} for ${money.format(invoice.total)} to ${invoice.customer.name} <${invoice.customer.email}>, with the PDF attached? It will be marked sent.${again} Ask the user, then call send_invoice again with confirm: true.`,
      data: {
        status: "needs_confirmation",
        invoice,
        organization: { org_id: ctx.orgId, name: ctx.org.name },
        can_send: true,
      },
    };
  }

  const result = await sendInvoiceDal(args.invoice_id, ctx);
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["invoices", "stats"], args.invoice_id);
  return invoiceResult(
    ctx,
    args.invoice_id,
    (sent) =>
      `Emailed invoice ${sent.invoice_id} (${money.format(sent.total)}) to ${sent.customer.email}. It's now marked sent.`,
    { status: "sent" },
  );
}

export const getInvoicePdfInputSchema = z.object({
  org_id: orgIdField,
  invoice_id: invoiceIdField,
});

export async function getInvoicePdfTool(
  ctx: CallerContext,
  args: z.infer<typeof getInvoicePdfInputSchema>,
): Promise<ToolResult> {
  const result = await getInvoicePdfDal(args.invoice_id, ctx);
  if (result.isErr()) return dalFailure(result.error);
  const filename = `invoice-${args.invoice_id.slice(0, 8)}.pdf`;
  const base64 = result.value.pdf.toString("base64");
  return {
    summary: `The PDF of invoice ${args.invoice_id} (${money.format(Number(result.value.invoice.total))}) is attached as ${filename}. It's also at ${APP_ORIGIN}/invoices/${args.invoice_id}.`,
    data: {
      invoice_id: args.invoice_id,
      filename,
      mime_type: "application/pdf",
      size_bytes: result.value.pdf.length,
    },
    resources: [
      {
        uri: `invoicepro://invoices/${args.invoice_id}/${filename}`,
        mimeType: "application/pdf",
        blob: base64,
      },
    ],
  };
}
