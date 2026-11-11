// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The MCP endpoint end to end: HTTP in, JSON-RPC through mcp-handler, the
 * tools, the real data layer, and mocked Clerk and database calls out.
 */

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  memberships: vi.fn(),
  subscription: vi.fn(),
  getOrganization: vi.fn(),
  orgMemberships: vi.fn(),
  getUser: vi.fn(),
  revalidateTag: vi.fn(),
  db: {
    fetchingCustomersDb: vi.fn(),
    getCustomerByIdDb: vi.fn(),
    createCustomerDb: vi.fn(),
    getCustomerCount: vi.fn(),
    fetchingProductsDb: vi.fn(),
    getProductByIdDb: vi.fn(),
    loadInvoiceByIdDb: vi.fn(),
    fetchingInvoicesDb: vi.fn(),
    createInvoiceDb: vi.fn(),
    getMonthlyInvoiceCount: vi.fn(),
    sendInvoiceDb: vi.fn(),
  },
}));

vi.mock("@/mcp/auth", () => ({ verifyMcpToken: mocks.verify }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: vi.fn() },
  clerkClient: async () => ({
    users: {
      getOrganizationMembershipList: mocks.memberships,
      getUser: mocks.getUser,
    },
    billing: { getOrganizationBillingSubscription: mocks.subscription },
    organizations: {
      getOrganization: mocks.getOrganization,
      getOrganizationMembershipList: mocks.orgMemberships,
    },
  }),
}));
vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock("@/db/customers", () => mocks.db);
vi.mock("@/db/products", () => mocks.db);
vi.mock("@/db/invoices", () => mocks.db);
vi.mock("@/db/stats", () => ({ getStatsDb: vi.fn(async () => []) }));
vi.mock("@/db/clerk", () => ({ isOverMemberShipLimit: async () => false }));

import { DELETE, GET, OPTIONS, POST } from "@/app/api/mcp/route";
import { resetRateLimits } from "@/mcp/rate-limit";

const ORG = "org_1";
const CUSTOMER = "11111111-1111-4111-8111-111111111111";
const PRODUCT = "22222222-2222-4222-8222-222222222222";
const INVOICE = "33333333-3333-4333-8333-333333333333";

const customer = {
  id: CUSTOMER,
  name: "Acme Corp",
  email: "billing@acme.test",
  phone: "403-555-0100",
  address_line1: "1 Main St",
  city: "Calgary",
  region: "AB",
  postal_code: "T2P 1J9",
  country: "Canada",
  org_id: ORG,
  status: "active" as const,
};

const fullInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: INVOICE,
  customer_id: CUSTOMER,
  total: 105,
  tax_rate: 5,
  total_override: null,
  status: "draft",
  org_id: ORG,
  created_at: "2026-11-01T12:00:00.000Z",
  customer,
  items: [
    {
      id: "i1",
      invoice_id: INVOICE,
      product_id: PRODUCT,
      description: null,
      quantity: 2,
      unit_price: 50,
      product: {
        id: PRODUCT,
        name: "Consulting",
        price: 50,
        org_id: ORG,
        status: "active",
      },
    },
  ],
  ...overrides,
});

let nextId = 1;

async function rpc(
  method: string,
  params: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  const res = await POST(
    new Request("https://www.invoicepro.patmac.ca/api/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer oat_good",
        "content-type": "application/json",
        accept: "application/json",
        "mcp-protocol-version": "2025-06-18",
        ...headers,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    }),
  );
  return res;
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await rpc("tools/call", { name, arguments: args });
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    result: {
      content: { type: string; text?: string }[];
      structuredContent: Record<string, unknown>;
      isError?: boolean;
    };
  };
  return body.result;
}

beforeEach(() => {
  resetRateLimits();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.verify.mockImplementation(async (_req: Request, token: string) =>
    token === "oat_good"
      ? {
          token,
          clientId: "client_claude",
          scopes: ["profile"],
          extra: { userId: "user_1" },
        }
      : undefined,
  );
  mocks.memberships.mockResolvedValue({
    data: [
      {
        role: "org:admin",
        organization: { id: ORG, name: "Pat's Plumbing", slug: "pats" },
      },
    ],
  });
  mocks.subscription.mockResolvedValue({
    subscriptionItems: [
      {
        plan: {
          features: [
            { slug: "stats" },
            { slug: "send_email" },
            { slug: "create_up_to_100_invoices_a_month" },
            { slug: "create_up_to_100_customers" },
          ],
        },
      },
    ],
  });
  mocks.getOrganization.mockResolvedValue({
    id: ORG,
    name: "Pat's Plumbing",
    imageUrl: "https://img.clerk.com/logo.png",
    hasImage: true,
  });
  mocks.orgMemberships.mockResolvedValue({ data: [] });
  mocks.db.loadInvoiceByIdDb.mockResolvedValue(fullInvoice());
  mocks.db.getProductByIdDb.mockResolvedValue({
    id: PRODUCT,
    name: "Consulting",
    price: "50.00",
    org_id: ORG,
    status: "active",
  });
  mocks.db.getMonthlyInvoiceCount.mockResolvedValue(0);
  mocks.db.getCustomerCount.mockResolvedValue(0);
});

describe("/api/mcp over HTTP", () => {
  it("asks for sign-in without a token", async () => {
    const res = await POST(
      new Request("https://www.invoicepro.patmac.ca/api/mcp", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://www.invoicepro.patmac.ca/.well-known/oauth-protected-resource/api/mcp"',
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("refuses a bad token", async () => {
    const res = await rpc("tools/list", {}, { authorization: "Bearer junk" });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(
      'error="invalid_token"',
    );
  });

  it("answers the CORS preflight on every method export", async () => {
    const res = await OPTIONS(
      new Request("https://www.invoicepro.patmac.ca/api/mcp", {
        method: "OPTIONS",
      }),
    );
    expect(res.status).toBe(204);
    expect(GET).toBe(POST);
    expect(DELETE).toBe(POST);
  });

  it("initializes with the server's name and instructions", async () => {
    const res = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: {
        serverInfo: { name: string };
        instructions: string;
        capabilities: Record<string, unknown>;
      };
    };
    expect(body.result.serverInfo.name).toBe("invoicepro");
    expect(body.result.instructions).toContain("send_invoice");
    expect(body.result.capabilities.tools).toEqual({ listChanged: false });
  });

  it("lists every tool with schemas Gemini accepts, and links the card", async () => {
    const res = await rpc("tools/list");
    const body = (await res.json()) as {
      result: {
        tools: {
          name: string;
          inputSchema: Record<string, unknown>;
          _meta?: Record<string, unknown>;
        }[];
      };
    };
    const names = body.result.tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "create_customer",
        "create_invoice",
        "create_product",
        "delete_customer",
        "delete_invoice",
        "delete_product",
        "get_customer",
        "get_invoice",
        "get_invoice_pdf",
        "get_organization",
        "get_stats",
        "list_customers",
        "list_invoices",
        "list_organizations",
        "list_products",
        "manage_logo",
        "send_invoice",
        "update_customer",
        "update_invoice",
        "update_invoice_status",
        "update_product",
      ].sort(),
    );
    const text = JSON.stringify(body.result.tools.map((t) => t.inputSchema));
    for (const bad of [
      '"$schema"',
      '"const"',
      '"exclusiveMinimum"',
      '"additionalProperties"',
    ]) {
      expect(text).not.toContain(bad);
    }
    const withCard = body.result.tools
      .filter((t) => t._meta?.ui)
      .map((t) => t.name)
      .sort();
    expect(withCard).toEqual([
      "create_invoice",
      "get_invoice",
      "send_invoice",
      "update_invoice",
      "update_invoice_status",
    ]);
  });

  it("serves the invoice card resource", async () => {
    const res = await rpc("resources/read", {
      uri: "ui://invoicepro/invoice-card.html",
    });
    const body = (await res.json()) as {
      result: { contents: { mimeType: string; text: string }[] };
    };
    expect(body.result.contents[0].mimeType).toBe("text/html;profile=mcp-app");
    expect(body.result.contents[0].text).toContain("<script>");
  });

  it("lists prompts", async () => {
    const res = await rpc("prompts/list");
    const body = (await res.json()) as {
      result: { prompts: { name: string }[] };
    };
    expect(body.result.prompts.map((p) => p.name)).toContain("new_invoice");
  });

  it("shows an invoice for the card", async () => {
    const result = await call("get_invoice", { invoice_id: INVOICE });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("$105.00 to Acme Corp");
    expect(result.structuredContent).toMatchObject({
      invoice: {
        invoice_id: INVOICE,
        subtotal: 100,
        tax: 5,
        total: 105,
        customer: { address: "1 Main St, Calgary, AB T2P 1J9, Canada" },
      },
      organization: { org_id: ORG, name: "Pat's Plumbing" },
      can_send: true,
    });
    expect(mocks.db.loadInvoiceByIdDb).toHaveBeenCalledWith(INVOICE, ORG);
  });

  it("creates an invoice for a new customer with a one-off item", async () => {
    mocks.db.createCustomerDb.mockResolvedValue({
      ...customer,
      id: CUSTOMER,
    });
    mocks.db.createInvoiceDb.mockResolvedValue({ id: INVOICE, org_id: ORG });

    const result = await call("create_invoice", {
      new_customer: {
        name: "Acme Corp",
        email: "billing@acme.test",
        city: "Calgary",
      },
      items: [
        { product_id: PRODUCT, quantity: 2 },
        { description: "Call-out fee", unit_price: 75 },
      ],
      tax_rate: 5,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toMatch(
      /^Added customer Acme Corp and created invoice/,
    );
    expect(mocks.db.createInvoiceDb).toHaveBeenCalledWith(
      {
        customer_id: CUSTOMER,
        items: [
          {
            product_id: PRODUCT,
            description: null,
            quantity: 2,
            unit_price: 50,
          },
          {
            product_id: null,
            description: "Call-out fee",
            quantity: 1,
            unit_price: 75,
          },
        ],
        tax_rate: 5,
        status: "draft",
        total_override: null,
      },
      ORG,
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith(`invoices-${ORG}`, {
      expire: 0,
    });
  });

  it("previews a send, then sends after confirm", async () => {
    const preview = await call("send_invoice", { invoice_id: INVOICE });
    expect(preview.structuredContent.status).toBe("needs_confirmation");
    expect(preview.content[0].text).toContain("Acme Corp <billing@acme.test>");
    expect(mocks.db.sendInvoiceDb).not.toHaveBeenCalled();

    mocks.db.sendInvoiceDb.mockResolvedValue({ id: INVOICE, org_id: ORG });
    mocks.db.loadInvoiceByIdDb.mockResolvedValue(
      fullInvoice({ status: "sent" }),
    );
    const sent = await call("send_invoice", {
      invoice_id: INVOICE,
      confirm: true,
    });
    expect(sent.isError).toBeUndefined();
    expect(sent.content[0].text).toContain("Emailed invoice");
    expect(mocks.db.sendInvoiceDb).toHaveBeenCalledWith(
      INVOICE,
      ORG,
      "Pat's Plumbing",
      "https://img.clerk.com/logo.png",
      undefined,
    );
  });

  it("doesn't refuse tools for the org's plan", async () => {
    mocks.subscription.mockResolvedValue({ subscriptionItems: [] });
    mocks.db.fetchingCustomersDb.mockResolvedValue({
      data: [],
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
    });
    const result = await call("list_customers");
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe("There are no customers yet.");
  });

  it("turns invalid arguments into a tool error", async () => {
    const result = await call("update_invoice_status", {
      invoice_id: INVOICE,
      status: "lost",
    });
    expect(result.isError).toBe(true);
  });

  it("rate limits a user who sends too many requests", async () => {
    const { MCP_REQUEST_LIMIT, checkRateLimit } = await import(
      "@/mcp/rate-limit"
    );
    for (let i = 0; i < MCP_REQUEST_LIMIT.limit; i++) {
      checkRateLimit(MCP_REQUEST_LIMIT, "user_1");
    }
    const res = await rpc("tools/list");
    expect(res.status).toBe(429);
  });
});
