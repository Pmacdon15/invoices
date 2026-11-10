import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { cardToolMeta, registerInvoiceCard } from "@/mcp/apps";
import {
  type CallerContext,
  callerFrom,
  contextFor,
  type McpCaller,
} from "@/mcp/caller";
import {
  createCustomerInputSchema,
  createCustomerTool,
  createProductInputSchema,
  createProductTool,
  deleteCustomerInputSchema,
  deleteCustomerTool,
  deleteProductInputSchema,
  deleteProductTool,
  getCustomerInputSchema,
  getCustomerTool,
  listCustomersInputSchema,
  listCustomersTool,
  listProductsInputSchema,
  listProductsTool,
  updateCustomerInputSchema,
  updateCustomerTool,
  updateProductInputSchema,
  updateProductTool,
} from "@/mcp/catalog-tools";
import { MCP_INSTRUCTIONS } from "@/mcp/instructions";
import {
  APP_ORIGIN,
  createInvoiceInputSchema,
  createInvoiceTool,
  deleteInvoiceInputSchema,
  deleteInvoiceTool,
  getInvoiceInputSchema,
  getInvoicePdfInputSchema,
  getInvoicePdfTool,
  getInvoiceTool,
  listInvoicesInputSchema,
  listInvoicesTool,
  sendInvoiceInputSchema,
  sendInvoiceTool,
  updateInvoiceInputSchema,
  updateInvoiceStatusInputSchema,
  updateInvoiceStatusTool,
  updateInvoiceTool,
} from "@/mcp/invoice-tools";
import {
  getOrganizationInputSchema,
  getOrganizationTool,
  getStatsInputSchema,
  getStatsTool,
  listOrganizationsInputSchema,
  listOrganizationsTool,
  manageLogoInputSchema,
  manageLogoTool,
} from "@/mcp/org-tools";
import { portable } from "@/mcp/portable-schema";
import { failure, respond, type ToolResult } from "@/mcp/results";

/*
 * The InvoicePro MCP server: its name, icons, instructions, tools and the
 * invoice card. Standard MCP only, with nothing specific to one AI app, so
 * any MCP client (Claude, Gemini, Muse, ChatGPT, ...) can use it.
 */

export const SERVER_INFO = {
  name: "invoicepro",
  title: "InvoicePro",
  version: "1.0.0",
  websiteUrl: APP_ORIGIN,
  icons: [
    {
      src: `${APP_ORIGIN}/favicon.ico`,
      mimeType: "image/x-icon",
      sizes: ["48x48"],
    },
  ],
};

export const SERVER_OPTIONS = {
  serverInfo: SERVER_INFO,
  instructions: MCP_INSTRUCTIONS,
  // The tool and prompt lists never change while a client is connected. Saying
  // so keeps clients from holding a `subscriptions/listen` stream open for
  // change notifications on serverless functions.
  capabilities: {
    tools: { listChanged: false },
    prompts: { listChanged: false },
    resources: { listChanged: false },
  },
};

type Extra = { http?: { authInfo?: AuthInfo } };

function clientName(server: McpServer) {
  return server.server.getClientVersion()?.name ?? null;
}

/** Bad input and unexpected errors as readable tool errors. */
async function guard(tool: () => Promise<ToolResult>) {
  try {
    return respond(await tool());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return respond(
        failure(
          `Invalid input: ${error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}`,
        ),
      );
    }
    console.error("MCP tool error", error);
    return respond(
      failure("Something went wrong in InvoicePro. Try again shortly."),
    );
  }
}

const notSignedIn = () =>
  respond(
    failure(
      "Not signed in to InvoicePro. Reconnect the connector and sign in.",
    ),
  );

/** Runs a tool that needs only the signed-in user. */
function runAsUser(
  server: McpServer,
  extra: Extra,
  tool: (caller: McpCaller) => Promise<ToolResult>,
) {
  const caller = callerFrom(extra.http?.authInfo, clientName(server));
  if (!caller) return notSignedIn();
  return guard(() => tool(caller));
}

/** Runs a tool in the caller's organization (from `org_id` or their only one). */
function runInOrg(
  server: McpServer,
  extra: Extra,
  orgId: string | undefined,
  tool: (ctx: CallerContext) => Promise<ToolResult>,
) {
  const caller = callerFrom(extra.http?.authInfo, clientName(server));
  if (!caller) return notSignedIn();
  return guard(async () => {
    const resolved = await contextFor(caller, orgId);
    if (!resolved.ok) {
      return failure(resolved.message, {
        status: resolved.status,
        organizations: resolved.organizations,
      });
    }
    return tool(resolved.ctx);
  });
}

const READ = { readOnlyHint: true, openWorldHint: false } as const;
const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;
const IDEMPOTENT_WRITE = { ...WRITE, idempotentHint: true } as const;
const DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerInvoiceTools(server: McpServer) {
  registerInvoiceCard(server);

  // ---------- organizations ----------

  server.registerTool(
    "list_organizations",
    {
      title: "List organizations",
      description:
        "Lists the InvoicePro organizations the signed-in user belongs to, with org_id, name, slug and role. With one organization every tool uses it automatically; with several, pass org_id to the other tools.",
      inputSchema: portable(listOrganizationsInputSchema),
      annotations: READ,
    },
    (_args, extra) => runAsUser(server, extra, listOrganizationsTool),
  );

  server.registerTool(
    "get_organization",
    {
      title: "Get organization and plan",
      description:
        "The organization's name, logo, your role, whether its plan can email invoices, and its plan features.",
      inputSchema: portable(getOrganizationInputSchema),
      annotations: READ,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) => getOrganizationTool(ctx)),
  );

  server.registerTool(
    "get_stats",
    {
      title: "Get stats",
      description:
        "The Stats page's numbers for the last 12 months, month by month: revenue (sent and paid invoices), amount still owing on sent invoices, invoice counts by status and customers invoiced, plus 12-month totals.",
      inputSchema: portable(getStatsInputSchema),
      annotations: READ,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) => getStatsTool(ctx)),
  );

  server.registerTool(
    "manage_logo",
    {
      title: "Set or remove the logo",
      description:
        "Admins only: sets the organization's logo from an image (base64 or an https URL) or removes it. Invoices, PDFs and invoice emails show it.",
      inputSchema: portable(manageLogoInputSchema),
      annotations: { ...IDEMPOTENT_WRITE, openWorldHint: true },
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) => manageLogoTool(ctx, args)),
  );

  // ---------- customers ----------

  server.registerTool(
    "list_customers",
    {
      title: "List customers",
      description:
        "Lists the organization's customers with customer_id, name, email, phone and address, 10 per page. Pass query to find someone by part of their name or email. Use it before invoicing to find the customer_id.",
      inputSchema: portable(listCustomersInputSchema),
      annotations: READ,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        listCustomersTool(ctx, args),
      ),
  );

  server.registerTool(
    "get_customer",
    {
      title: "Get a customer",
      description: "One customer's details by customer_id.",
      inputSchema: portable(getCustomerInputSchema),
      annotations: READ,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) => getCustomerTool(ctx, args)),
  );

  server.registerTool(
    "create_customer",
    {
      title: "Add a customer",
      description:
        "Adds a customer with name and email, and optionally phone and postal address. Only after the user agreed to add them. The plan's customer limit applies.",
      inputSchema: portable(createCustomerInputSchema),
      annotations: WRITE,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        createCustomerTool(ctx, args),
      ),
  );

  server.registerTool(
    "update_customer",
    {
      title: "Edit a customer",
      description:
        "Changes a customer's name, email, phone or address. Pass only what changes; an empty string clears an optional field. Their invoices show the new details.",
      inputSchema: portable(updateCustomerInputSchema),
      annotations: IDEMPOTENT_WRITE,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        updateCustomerTool(ctx, args),
      ),
  );

  server.registerTool(
    "delete_customer",
    {
      title: "Delete a customer",
      description:
        "Removes a customer from the list (existing invoices stay). Call without confirm to get a preview, ask the user, then call again with confirm: true.",
      inputSchema: portable(deleteCustomerInputSchema),
      annotations: DESTRUCTIVE,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        deleteCustomerTool(ctx, args),
      ),
  );

  // ---------- products ----------

  server.registerTool(
    "list_products",
    {
      title: "List products",
      description:
        "Lists the organization's products and services with product_id, name and price, 10 per page. Pass query to search by name.",
      inputSchema: portable(listProductsInputSchema),
      annotations: READ,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        listProductsTool(ctx, args),
      ),
  );

  server.registerTool(
    "create_product",
    {
      title: "Add a product",
      description:
        "Adds a product or service to the catalog with a name and unit price, for use on invoices. Only after the user agreed to add it. The plan's product limit applies.",
      inputSchema: portable(createProductInputSchema),
      annotations: WRITE,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        createProductTool(ctx, args),
      ),
  );

  server.registerTool(
    "update_product",
    {
      title: "Edit a product",
      description:
        "Changes a product's name or price. A new price applies to invoices made from now on; existing invoices keep theirs (edit those with update_invoice).",
      inputSchema: portable(updateProductInputSchema),
      annotations: IDEMPOTENT_WRITE,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        updateProductTool(ctx, args),
      ),
  );

  server.registerTool(
    "delete_product",
    {
      title: "Delete a product",
      description:
        "Removes a product from the catalog (existing invoices keep it). Call without confirm to get a preview, ask the user, then call again with confirm: true.",
      inputSchema: portable(deleteProductInputSchema),
      annotations: DESTRUCTIVE,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        deleteProductTool(ctx, args),
      ),
  );

  // ---------- invoices ----------

  server.registerTool(
    "list_invoices",
    {
      title: "List invoices",
      description:
        "Lists invoices newest first, 10 per page, with invoice_id, customer, status, total and date. Filter by status ('draft', 'sent' = unpaid, 'paid') and/or search by customer name or email, ID, total or date.",
      inputSchema: portable(listInvoicesInputSchema),
      annotations: READ,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        listInvoicesTool(ctx, args),
      ),
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Show an invoice",
      description:
        "One invoice in full: customer with contact details, line items, subtotal, tax, manual total if set, total and status. In apps that support it, it's shown as an interactive invoice card where the user can edit, send (after confirming) or download it; pass mode 'edit' to open the card ready to edit.",
      inputSchema: portable(getInvoiceInputSchema),
      annotations: READ,
      _meta: cardToolMeta(),
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) => getInvoiceTool(ctx, args)),
  );

  server.registerTool(
    "create_invoice",
    {
      title: "Create an invoice",
      description:
        "Creates an invoice (a draft unless status says otherwise) for an existing customer (customer_id) or a new one (new_customer, only after the user agreed to add them). Items are catalog products (product_id, price defaults to the product's) or one-off items (description + unit_price). Optional tax_rate (%) and total_override (manual total). Doesn't email it. The plan's monthly invoice limit applies.",
      inputSchema: portable(createInvoiceInputSchema),
      annotations: WRITE,
      _meta: cardToolMeta(),
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        createInvoiceTool(ctx, args),
      ),
  );

  server.registerTool(
    "update_invoice",
    {
      title: "Edit an invoice",
      description:
        "Changes an invoice's customer, line items (the full new list), tax rate, status or manual total (total_override; null returns to the computed total). Pass only what changes. Doesn't email it.",
      inputSchema: portable(updateInvoiceInputSchema),
      annotations: IDEMPOTENT_WRITE,
      _meta: cardToolMeta(),
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        updateInvoiceTool(ctx, args),
      ),
  );

  server.registerTool(
    "update_invoice_status",
    {
      title: "Change an invoice's status",
      description:
        "Marks an invoice draft, sent or paid (e.g. when the customer pays). Marking it sent doesn't email it; use send_invoice for that.",
      inputSchema: portable(updateInvoiceStatusInputSchema),
      annotations: IDEMPOTENT_WRITE,
      _meta: cardToolMeta(),
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        updateInvoiceStatusTool(ctx, args),
      ),
  );

  server.registerTool(
    "send_invoice",
    {
      title: "Email an invoice",
      description:
        "Emails the invoice with its PDF to the customer and marks it sent. Call without confirm first: that sends nothing and returns who it goes to and the amount; show it to the user, and only after they agree call again with confirm: true. Needs the plan's email feature.",
      inputSchema: portable(sendInvoiceInputSchema),
      annotations: { ...WRITE, openWorldHint: true },
      _meta: cardToolMeta(),
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) => sendInvoiceTool(ctx, args)),
  );

  server.registerTool(
    "delete_invoice",
    {
      title: "Delete an invoice",
      description:
        "Permanently deletes an invoice. Call without confirm to get a preview, ask the user, then call again with confirm: true.",
      inputSchema: portable(deleteInvoiceInputSchema),
      annotations: DESTRUCTIVE,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        deleteInvoiceTool(ctx, args),
      ),
  );

  server.registerTool(
    "get_invoice_pdf",
    {
      title: "Get an invoice PDF",
      description:
        "The invoice as a PDF attachment, the same document send_invoice emails.",
      inputSchema: portable(getInvoicePdfInputSchema),
      annotations: READ,
    },
    (args, extra) =>
      runInOrg(server, extra, args.org_id, (ctx) =>
        getInvoicePdfTool(ctx, args),
      ),
  );
}
