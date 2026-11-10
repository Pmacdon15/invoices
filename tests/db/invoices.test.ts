import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlMock } from "./sql-mock";

const mocks = vi.hoisted(() => {
  const pdf = {
    instances: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
    output: new ArrayBuffer(4) as ArrayBuffer,
  };
  return {
    neon: vi.fn(),
    cacheTag: vi.fn(),
    send: vi.fn(),
    sesConfig: vi.fn(),
    command: vi.fn(),
    pdf,
  };
});

vi.mock("@neondatabase/serverless", () => ({ neon: mocks.neon }));
vi.mock("next/cache", () => ({ cacheTag: mocks.cacheTag }));
vi.mock("jspdf", () => ({
  jsPDF: class {
    calls: Record<string, ReturnType<typeof vi.fn>>;
    constructor() {
      this.calls = {
        addImage: vi.fn(),
        addPage: vi.fn(),
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        line: vi.fn(),
        output: vi.fn(() => mocks.pdf.output),
      };
      Object.assign(this, this.calls);
      mocks.pdf.instances.push(this.calls);
    }
  },
}));
vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: class {
    constructor(config: unknown) {
      mocks.sesConfig(config);
    }
    send = mocks.send;
  },
  SendRawEmailCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
      mocks.command(input);
    }
  },
}));

import type { CreateInvoiceInput, UpdateInvoiceInput } from "@/dal/types";
import {
  createInvoiceDb,
  deleteInvoiceDb,
  fetchingInvoiceByIdDb,
  fetchingInvoicesDb,
  getMonthlyInvoiceCount,
  searchInvoicesDb,
  sendInvoiceDb,
  updateInvoiceDb,
  updateInvoiceStatusDb,
} from "@/db/invoices";

const sql = createSqlMock();

// The parsed input type always has tax_rate, but the db layer defaults it
// when a caller leaves it out, so the tests call it both ways.
type Loose<T> = Omit<T, "tax_rate"> & { tax_rate?: number };
const create = (input: Loose<CreateInvoiceInput>, orgId: string) =>
  createInvoiceDb(input as CreateInvoiceInput, orgId);
const update = (input: Loose<UpdateInvoiceInput>, orgId: string) =>
  updateInvoiceDb(input as UpdateInvoiceInput, orgId);

beforeEach(() => {
  sql.reset();
  mocks.neon.mockReturnValue(sql.sql);
  mocks.pdf.instances.length = 0;
  mocks.pdf.output = new ArrayBuffer(4);
  mocks.send.mockReset();
  vi.stubEnv("DATABASE_URL", "postgres://test");
});

const ORG = "org_1";
const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const P1 = "22222222-2222-4222-8222-222222222222";
const P2 = "33333333-3333-4333-8333-333333333333";

const row = {
  id: "inv-1",
  customer_id: CUSTOMER_ID,
  total: 230,
  tax_rate: 15,
  status: "draft",
  org_id: ORG,
  created_at: "2026-01-15T12:00:00.000Z",
};

const items = [
  { product_id: P1, quantity: 2, unit_price: 50 },
  { product_id: P2, quantity: 1, unit_price: 100 },
];

describe("config errors", () => {
  it.each([
    ["fetchingInvoicesDb", () => fetchingInvoicesDb(ORG)],
    ["searchInvoicesDb", () => searchInvoicesDb(ORG, "x")],
    ["fetchingInvoiceByIdDb", () => fetchingInvoiceByIdDb("inv-1", ORG)],
    [
      "createInvoiceDb",
      () => create({ customer_id: CUSTOMER_ID, status: "draft", items }, ORG),
    ],
    ["deleteInvoiceDb", () => deleteInvoiceDb("inv-1", ORG)],
    [
      "updateInvoiceStatusDb",
      () => updateInvoiceStatusDb("inv-1", "paid", ORG),
    ],
    ["sendInvoiceDb", () => sendInvoiceDb("inv-1", ORG, "Org")],
    [
      "updateInvoiceDb",
      () =>
        update(
          { id: "inv-1", customer_id: CUSTOMER_ID, status: "draft", items },
          ORG,
        ),
    ],
  ])("%s throws without DATABASE_URL", async (_name, run) => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(run()).rejects.toThrow("Config Error");
    expect(sql.calls).toHaveLength(0);
  });
});

describe("fetchingInvoicesDb", () => {
  const joined = {
    ...row,
    customer_name: "Acme",
    customer_email: "a@acme.com",
  };

  it("pages the org's invoices and nests the customer", async () => {
    sql.respond(({ text }) =>
      text.startsWith("SELECT COUNT(*)") ? [{ total: "21" }] : [joined],
    );

    await expect(fetchingInvoicesDb(ORG, 2)).resolves.toEqual({
      data: [
        {
          ...joined,
          customer: {
            id: CUSTOMER_ID,
            name: "Acme",
            email: "a@acme.com",
            org_id: ORG,
          },
        },
      ],
      currentPage: 2,
      totalPages: 3,
      totalCount: 21,
    });
    expect(mocks.cacheTag).toHaveBeenCalledWith(
      `invoices-${ORG}`,
      `invoices-${ORG}-page-2`,
    );
    const where = sql.calls.find((c) => c.text.startsWith("WHERE"));
    expect(where?.text).toBe("WHERE i.org_id = ?");
    expect(where?.values).toEqual([ORG]);
    const pageQuery = sql.queries().find((c) => c.text.includes("LIMIT"));
    expect(pageQuery?.values.slice(1)).toEqual([10, 10]);
  });

  it("defaults to page 1 and filters by the search query", async () => {
    sql.respond(({ text }) =>
      text.startsWith("SELECT COUNT(*)") ? [{ total: "0" }] : [],
    );

    await expect(fetchingInvoicesDb(ORG, undefined, "acme")).resolves.toEqual({
      data: [],
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
    });
    const where = sql.calls.find((c) => c.text.startsWith("WHERE"));
    expect(where?.text).toContain("c.name ILIKE ?");
    expect(where?.values).toEqual([
      ORG,
      "%acme%",
      "%acme%",
      "%acme%",
      "%acme%",
      "%acme%",
    ]);
  });
});

describe("searchInvoicesDb", () => {
  it("returns up to ten matches with their customer", async () => {
    sql.respond(() => [
      {
        ...row,
        customer_name: "Acme",
        customer_email: "a@acme.com",
        customer_status: "active",
      },
    ]);

    const result = await searchInvoicesDb(ORG, "ac");
    expect(result).toHaveLength(1);
    expect(result[0].customer).toEqual({
      id: CUSTOMER_ID,
      name: "Acme",
      email: "a@acme.com",
      org_id: ORG,
      status: "active",
    });
    expect(mocks.cacheTag).toHaveBeenCalledWith(`invoices-${ORG}`);
    const [query] = sql.queries();
    expect(query.text).toContain("LIMIT 10");
    expect(query.values).toEqual([ORG, "%ac%", "%ac%", "%ac%", "%ac%", "%ac%"]);
  });
});

describe("fetchingInvoiceByIdDb", () => {
  it("returns null when the invoice isn't in the org", async () => {
    await expect(fetchingInvoiceByIdDb("inv-1", ORG)).resolves.toBeNull();
    expect(sql.queries()).toHaveLength(1);
    expect(sql.queries()[0].values).toEqual(["inv-1", ORG]);
    expect(mocks.cacheTag).toHaveBeenCalledWith("invoice-inv-1");
  });

  it("returns the invoice with its customer and items", async () => {
    sql.respond(({ text }) =>
      text.includes("FROM invoice_items")
        ? [
            {
              id: "it-1",
              invoice_id: "inv-1",
              product_id: P1,
              quantity: 2,
              unit_price: 50,
              product_name: "Design",
              product_status: "disabled",
            },
          ]
        : [
            {
              ...row,
              customer_name: "Acme",
              customer_email: "a@acme.com",
              customer_status: "active",
            },
          ],
    );

    const invoice = await fetchingInvoiceByIdDb("inv-1", ORG);
    expect(invoice?.customer).toEqual({
      id: CUSTOMER_ID,
      name: "Acme",
      email: "a@acme.com",
      org_id: ORG,
      status: "active",
    });
    expect(invoice?.items).toEqual([
      expect.objectContaining({
        id: "it-1",
        product: {
          id: P1,
          name: "Design",
          price: 50,
          org_id: ORG,
          status: "disabled",
        },
      }),
    ]);
    expect(sql.queries()[1].values).toEqual(["inv-1"]);
  });
});

describe("createInvoiceDb", () => {
  it("inserts the invoice with its computed total and items", async () => {
    sql.respond(() => [{ ...row, customer_ok: "1", products_ok: "2" }]);

    await expect(
      create(
        { customer_id: CUSTOMER_ID, status: "draft", tax_rate: 15, items },
        ORG,
      ),
    ).resolves.toEqual(row);

    const [query] = sql.queries();
    expect(query.text).toContain("status = 'active'");
    expect(query.values).toEqual([
      CUSTOMER_ID,
      ORG,
      [P1, P2],
      ORG,
      "draft",
      ORG,
      230,
      15,
      2,
      [P1, P2],
      [2, 1],
      [50, 100],
    ]);
  });

  it("counts repeated products once and defaults tax to 0", async () => {
    sql.respond(() => [{ ...row, customer_ok: "1", products_ok: "1" }]);
    await create(
      {
        customer_id: CUSTOMER_ID,
        status: "sent",
        items: [items[0], items[0]],
      },
      ORG,
    );
    const values = sql.queries()[0].values;
    expect(values.slice(6, 9)).toEqual([200, 0, 1]);
  });

  it("rejects a customer that isn't active in the org", async () => {
    sql.respond(() => [{ id: null, customer_ok: "0", products_ok: "2" }]);
    await expect(
      create({ customer_id: CUSTOMER_ID, status: "draft", items }, ORG),
    ).rejects.toThrow("Customer not found or is disabled");
  });

  it("rejects products that aren't active in the org", async () => {
    sql.respond(() => [{ id: null, customer_ok: "1", products_ok: "1" }]);
    await expect(
      create({ customer_id: CUSTOMER_ID, status: "draft", items }, ORG),
    ).rejects.toThrow("One or more products are not found or are disabled");
  });

  it("reports any other failure to insert", async () => {
    sql.respond(() => [{ id: null, customer_ok: "1", products_ok: "2" }]);
    await expect(
      create({ customer_id: CUSTOMER_ID, status: "draft", items }, ORG),
    ).rejects.toThrow("Failed to create invoice");
  });
});

describe("deleteInvoiceDb", () => {
  it("deletes the items, then the invoice, scoped to the org", async () => {
    sql.respond(({ text }) =>
      text.startsWith("DELETE FROM invoices") ? [row] : [],
    );
    await expect(deleteInvoiceDb("inv-1", ORG)).resolves.toEqual(row);
    const [itemsQuery, invoiceQuery] = sql.queries();
    expect(itemsQuery.text).toContain("DELETE FROM invoice_items");
    expect(itemsQuery.values).toEqual(["inv-1", ORG]);
    expect(invoiceQuery.values).toEqual(["inv-1", ORG]);
  });

  it("throws when no invoice in the org matched", async () => {
    await expect(deleteInvoiceDb("inv-1", "org_2")).rejects.toThrow(
      "Invoice not found or not authorized",
    );
  });
});

describe("updateInvoiceStatusDb", () => {
  it("updates the status within the org", async () => {
    sql.respond(() => [{ ...row, status: "paid" }]);
    await expect(
      updateInvoiceStatusDb("inv-1", "paid", ORG),
    ).resolves.toMatchObject({ status: "paid" });
    expect(sql.queries()[0].values).toEqual(["paid", "inv-1", ORG]);
  });

  it("throws when no invoice in the org matched", async () => {
    await expect(
      updateInvoiceStatusDb("inv-1", "paid", "org_2"),
    ).rejects.toThrow("Invoice not found or not authorized");
  });
});

describe("getMonthlyInvoiceCount", () => {
  it("counts invoices created since the start of this month", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-18T15:30:00.000Z"));
    sql.respond(() => [{ count: "4" }]);

    await expect(getMonthlyInvoiceCount(ORG)).resolves.toBe(4);
    expect(sql.queries()[0].values).toEqual([ORG, "2026-03-01T00:00:00.000Z"]);
  });

  it("returns 0 when the query gives no row", async () => {
    await expect(getMonthlyInvoiceCount(ORG)).resolves.toBe(0);
  });
});

describe("updateInvoiceDb", () => {
  const input = {
    id: "inv-1",
    customer_id: CUSTOMER_ID,
    status: "sent" as const,
    tax_rate: 15,
    items,
  };

  it("updates the invoice and replaces its items, scoped to the org", async () => {
    sql.respond(() => [{ ...row, customer_ok: "1", products_ok: "2" }]);
    await expect(update(input, ORG)).resolves.toEqual(row);

    const [query] = sql.queries();
    expect(query.text).toContain("status != 'deleted'");
    expect(query.text).toContain("DELETE FROM invoice_items");
    expect(query.values).toEqual([
      CUSTOMER_ID,
      ORG,
      [P1, P2],
      ORG,
      "sent",
      230,
      15,
      "inv-1",
      ORG,
      2,
      [P1, P2],
      [2, 1],
      [50, 100],
    ]);
  });

  it("defaults tax to 0", async () => {
    sql.respond(() => [{ ...row, customer_ok: "1", products_ok: "2" }]);
    await update({ ...input, tax_rate: undefined }, ORG);
    expect(sql.queries()[0].values.slice(5, 7)).toEqual([200, 0]);
  });

  it("rejects a customer from another org", async () => {
    sql.respond(() => [{ id: null, customer_ok: "0", products_ok: "2" }]);
    await expect(update(input, ORG)).rejects.toThrow(
      "Customer not found or is disabled",
    );
  });

  it("rejects products from another org", async () => {
    sql.respond(() => [{ id: null, customer_ok: "1", products_ok: "0" }]);
    await expect(update(input, ORG)).rejects.toThrow(
      "One or more products are not found or are disabled",
    );
  });

  it("throws when the invoice isn't in the org", async () => {
    sql.respond(() => [{ id: null, customer_ok: "1", products_ok: "2" }]);
    await expect(update(input, ORG)).rejects.toThrow(
      "Invoice not found or not authorized",
    );
  });

  it("treats a missing result row as a failed validation", async () => {
    await expect(update(input, ORG)).rejects.toThrow(
      "One or more products are not found or are disabled",
    );
  });
});

describe("sendInvoiceDb", () => {
  const invoiceRow = {
    ...row,
    customer_name: "Ann <script>",
    customer_email: "ann@acme.com",
  };
  const itemRows = [
    { product_name: "Design & Build", quantity: 2, unit_price: 50 },
    { product_name: "Support", quantity: 1, unit_price: 100 },
  ];

  function respondWith(
    opts: { invoice?: unknown; items?: unknown[]; updated?: unknown[] } = {},
  ) {
    sql.respond(({ text }) => {
      if (text.includes("FROM invoice_items")) return opts.items ?? itemRows;
      if (text.startsWith("UPDATE invoices"))
        return opts.updated ?? [{ ...row, status: "sent" }];
      return "invoice" in opts ? [opts.invoice].filter(Boolean) : [invoiceRow];
    });
  }

  const rawEmail = () => {
    const input = mocks.command.mock.calls.at(-1)?.[0] as {
      RawMessage: { Data: Buffer };
    };
    return input.RawMessage.Data.toString();
  };

  beforeEach(() => {
    vi.stubEnv("AWS_ACCESS_KEY_ID", "AKID");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "SECRET");
    vi.stubEnv("AWS_REGION", "ca-central-1");
    vi.stubEnv("SES_FROM_EMAIL", "billing@invoicepro.test");
    mocks.send.mockResolvedValue({});
  });

  it.each([
    ["AWS_ACCESS_KEY_ID"],
    ["AWS_SECRET_ACCESS_KEY"],
  ])("refuses to send without %s", async (name) => {
    vi.stubEnv(name, "");
    await expect(sendInvoiceDb("inv-1", ORG, "Org")).rejects.toThrow(
      "AWS SES credentials are not configured",
    );
    expect(sql.calls).toHaveLength(0);
  });

  it("throws when the invoice isn't in the org", async () => {
    respondWith({ invoice: undefined });
    await expect(sendInvoiceDb("inv-1", ORG, "Org")).rejects.toThrow(
      "Invoice not found or not authorized",
    );
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("emails an escaped HTML invoice with a PDF and marks it sent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    vi.stubGlobal("fetch", fetchMock);
    respondWith();

    await expect(
      sendInvoiceDb(
        "inv-1",
        ORG,
        'Bob\'s "Shop"',
        "https://img.test/logo.png",
        "admin@shop.test",
      ),
    ).resolves.toMatchObject({ status: "sent" });

    expect(mocks.sesConfig).toHaveBeenCalledWith({
      region: "ca-central-1",
      credentials: { accessKeyId: "AKID", secretAccessKey: "SECRET" },
    });
    expect(mocks.send).toHaveBeenCalledTimes(1);

    const raw = rawEmail();
    expect(raw).toContain("<billing@invoicepro.test>");
    expect(raw).toContain("To: ann@acme.com");
    expect(raw).toContain("Ann &lt;script&gt;");
    expect(raw).not.toContain("Ann <script>");
    expect(raw).toContain("Design &amp; Build");
    expect(raw).toContain('src="https://img.test/logo.png"');
    expect(raw).toContain("admin@shop.test");
    expect(raw).toContain("Tax (15%)");
    expect(raw).toContain("$200.00"); // subtotal
    expect(raw).toContain("$30.00"); // tax
    expect(raw).toContain("$230.00"); // total
    expect(raw).toContain('Content-Type: application/pdf; name="invoice.pdf"');
    expect(raw).toContain(Buffer.from(new ArrayBuffer(4)).toString("base64"));

    // The logo is fetched and placed in the PDF.
    expect(fetchMock).toHaveBeenCalledWith("https://img.test/logo.png");
    const [pdf] = mocks.pdf.instances;
    expect(pdf.addImage).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      "PNG",
      20,
      20,
      30,
      30,
    );
    const texts = pdf.text.mock.calls.map((c) => c[0]);
    expect(texts).toEqual(
      expect.arrayContaining([
        "INVOICE",
        'From: Bob\'s "Shop"',
        "Invoice ID: inv-1",
        "Ann <script>",
        "Design & Build",
        "Tax (15%):",
        "$30.00",
        "TOTAL DUE:",
        "$230.00",
      ]),
    );

    const update = sql.queries().at(-1);
    expect(update?.text).toContain("SET status = 'sent'");
    expect(update?.values).toEqual(["inv-1", ORG]);
  });

  it("skips the logo, admin note and tax line when there are none", async () => {
    vi.stubEnv("SES_FROM_EMAIL", undefined as unknown as string);
    vi.stubEnv("AWS_REGION", undefined as unknown as string);
    respondWith({ invoice: { ...invoiceRow, tax_rate: null, total: 200 } });

    await sendInvoiceDb("inv-1", ORG, "Org");

    expect(mocks.sesConfig).toHaveBeenCalledWith(
      expect.objectContaining({ region: "us-east-1" }),
    );
    const raw = rawEmail();
    expect(raw).toContain("<invoices@yourdomain.com>");
    expect(raw).not.toContain("<img");
    expect(raw).not.toContain("organization administrator");
    expect(raw).not.toContain("Tax (");
    const [pdf] = mocks.pdf.instances;
    expect(pdf.addImage).not.toHaveBeenCalled();
    expect(pdf.text.mock.calls.map((c) => c[0])).not.toContain(
      expect.stringMatching(/^Tax/),
    );
  });

  it("still sends when the logo can't be fetched", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    respondWith();

    await sendInvoiceDb("inv-1", ORG, "Org", "https://img.test/logo.png");

    expect(error).toHaveBeenCalledWith(
      "Failed to add logo to PDF:",
      expect.any(Error),
    );
    expect(mocks.pdf.instances[0].addImage).not.toHaveBeenCalled();
    expect(mocks.send).toHaveBeenCalled();
  });

  it("starts a new PDF page when the items run off the page", async () => {
    respondWith({
      items: Array.from({ length: 30 }, (_, i) => ({
        product_name: `Item ${i}`,
        quantity: 1,
        unit_price: 1,
      })),
    });
    await sendInvoiceDb("inv-1", ORG, "Org");
    expect(mocks.pdf.instances[0].addPage).toHaveBeenCalled();
  });

  it("sends an empty attachment body when the PDF is empty", async () => {
    mocks.pdf.output = new ArrayBuffer(0);
    respondWith();
    await sendInvoiceDb("inv-1", ORG, "Org");
    expect(rawEmail()).toContain("size=0");
  });

  it("throws if the invoice disappears before it's marked sent", async () => {
    respondWith({ updated: [] });
    await expect(sendInvoiceDb("inv-1", ORG, "Org")).rejects.toThrow(
      "Invoice not found or not authorized",
    );
    expect(mocks.send).toHaveBeenCalled();
  });
});
