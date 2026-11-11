import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CUSTOMER,
  ctxWith,
  customer,
  err,
  fullInvoice,
  INVOICE,
  ORG,
  ok,
  PRODUCT,
  product,
} from "./helpers";

const mocks = vi.hoisted(() => ({
  createInvoiceDal: vi.fn(),
  deleteInvoiceDal: vi.fn(),
  getInvoiceById: vi.fn(),
  getInvoicePdfDal: vi.fn(),
  getInvoices: vi.fn(),
  sendInvoiceDal: vi.fn(),
  updateInvoiceDal: vi.fn(),
  updateInvoiceStatusDal: vi.fn(),
  getProductByIdDal: vi.fn(),
  createCustomerDal: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/dal/invoices", () => mocks);
vi.mock("@/dal/products", () => ({
  getProductByIdDal: mocks.getProductByIdDal,
}));
vi.mock("@/dal/customers", () => ({
  createCustomerDal: mocks.createCustomerDal,
}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

import {
  createInvoiceTool,
  deleteInvoiceTool,
  getInvoicePdfTool,
  getInvoiceTool,
  invoiceView,
  listInvoicesTool,
  sendInvoiceTool,
  updateInvoiceStatusTool,
  updateInvoiceTool,
} from "@/mcp/invoice-tools";

const ctx = ctxWith();
const found = (overrides: Record<string, unknown> = {}) => ({
  data: fullInvoice(overrides),
  error: null,
});

beforeEach(() => {
  mocks.getInvoiceById.mockResolvedValue(found());
  mocks.getProductByIdDal.mockResolvedValue({ data: product, error: null });
});

describe("invoiceView", () => {
  it("adds totals, one-off flags and the app link", () => {
    const view = invoiceView(
      fullInvoice({
        total: 200,
        total_override: "200.00",
        tax_rate: null,
        items: [
          ...fullInvoice().items,
          {
            id: "i2",
            invoice_id: INVOICE,
            product_id: null,
            description: "Call-out",
            quantity: 1,
            unit_price: 75,
            product: null,
          },
        ],
      }) as never,
    );
    expect(view).toMatchObject({
      subtotal: 175,
      tax: 0,
      tax_rate: 0,
      computed_total: 175,
      total_override: 200,
      total: 200,
      app_url: `https://www.invoicepro.patmac.ca/invoices/${INVOICE}`,
    });
    expect(view.items[1]).toEqual({
      product_id: null,
      description: "Call-out",
      name: "Call-out",
      one_off: true,
      quantity: 1,
      unit_price: 75,
      amount: 75,
    });
    const minimal = invoiceView(
      fullInvoice({
        total_override: undefined,
        items: [{ id: "i", invoice_id: INVOICE, quantity: 1, unit_price: 1 }],
      }) as never,
    );
    expect(minimal.total_override).toBeNull();
    expect(minimal.items[0]).toMatchObject({
      product_id: null,
      description: null,
    });
  });
});

describe("list_invoices", () => {
  it("filters by status and search, and pages", async () => {
    mocks.getInvoices.mockResolvedValue({
      data: {
        data: [
          {
            id: INVOICE,
            customer_id: CUSTOMER,
            status: "sent",
            total: "105.00",
            created_at: "2026-11-01T12:00:00Z",
            customer,
          },
          {
            id: "x",
            status: "draft",
            total: 1,
            created_at: "2026-11-02T00:00:00Z",
          },
        ],
        currentPage: 2,
        totalPages: 3,
        totalCount: 25,
      },
      error: null,
    });
    const result = await listInvoicesTool(ctx, {
      status: "sent",
      query: "acme",
      page: 2,
    });
    expect(mocks.getInvoices).toHaveBeenCalledWith(2, "acme", ctx, "sent");
    expect(result.summary).toBe("25 invoice(s); page 2 of 3.");
    expect(result.data.invoices).toEqual([
      {
        invoice_id: INVOICE,
        customer_name: "Acme Corp",
        customer_email: "billing@acme.test",
        status: "sent",
        total: 105,
        created_at: "2026-11-01T12:00:00.000Z",
      },
      {
        invoice_id: "x",
        customer_name: null,
        customer_email: null,
        status: "draft",
        total: 1,
        created_at: "2026-11-02T00:00:00.000Z",
      },
    ]);
  });

  it("says when nothing matches, and passes errors on", async () => {
    mocks.getInvoices.mockResolvedValue({
      data: { data: [], currentPage: 1, totalPages: 0, totalCount: 0 },
      error: null,
    });
    expect((await listInvoicesTool(ctx, { query: "" })).summary).toBe(
      "No invoices match.",
    );
    expect(mocks.getInvoices).toHaveBeenLastCalledWith(
      1,
      undefined,
      ctx,
      undefined,
    );
    mocks.getInvoices.mockResolvedValue({ data: null, error: "No org" });
    expect((await listInvoicesTool(ctx, {})).isError).toBe(true);
  });
});

describe("get_invoice", () => {
  it("returns the card data, fresh", async () => {
    const result = await getInvoiceTool(ctx, { invoice_id: INVOICE });
    expect(mocks.getInvoiceById).toHaveBeenCalledWith(INVOICE, ctx, true);
    expect(result.summary).toBe(
      `Invoice ${INVOICE}: $105.00 to Acme Corp (draft).`,
    );
    expect(result.data).toMatchObject({
      organization: { org_id: ORG, name: "Pat's Plumbing" },
      can_send: true,
    });
    expect(result.data).not.toHaveProperty("mode");
    const noEmail = await getInvoiceTool(ctxWith(["stats"]), {
      invoice_id: INVOICE,
    });
    expect(noEmail.data).toMatchObject({ can_send: false });
  });

  it("passes a missing invoice on", async () => {
    mocks.getInvoiceById.mockResolvedValue({
      data: null,
      error: "Invoice not found",
    });
    expect((await getInvoiceTool(ctx, { invoice_id: INVOICE })).summary).toBe(
      "Invoice not found",
    );
  });
});

describe("create_invoice", () => {
  it("needs exactly one of customer_id and new_customer", async () => {
    const items = [{ product_id: PRODUCT }];
    expect((await createInvoiceTool(ctx, { items })).summary).toContain(
      "Say who the invoice is for",
    );
    expect(
      (
        await createInvoiceTool(ctx, {
          items,
          customer_id: CUSTOMER,
          new_customer: { name: "A B", email: "a@b" },
        })
      ).summary,
    ).toBe("Pass customer_id or new_customer, not both.");
    expect(mocks.createInvoiceDal).not.toHaveBeenCalled();
  });

  it("uses the product's price unless one is given, and makes a draft", async () => {
    mocks.createInvoiceDal.mockResolvedValue(ok({ id: INVOICE, org_id: ORG }));
    const result = await createInvoiceTool(ctx, {
      customer_id: CUSTOMER,
      items: [
        { product_id: PRODUCT, quantity: 3, description: "  " },
        { product_id: PRODUCT, unit_price: 40, description: "Discounted" },
      ],
    });
    expect(mocks.getProductByIdDal).toHaveBeenCalledTimes(1);
    expect(mocks.createInvoiceDal).toHaveBeenCalledWith(
      {
        customer_id: CUSTOMER,
        items: [
          {
            product_id: PRODUCT,
            description: null,
            quantity: 3,
            unit_price: 50,
          },
          {
            product_id: PRODUCT,
            description: "Discounted",
            quantity: 1,
            unit_price: 40,
          },
        ],
        tax_rate: 0,
        status: "draft",
        total_override: null,
      },
      ctx,
    );
    expect(result.summary).toMatch(
      /^Created invoice .* It hasn't been emailed/,
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith(`invoice-${INVOICE}`, {
      expire: 0,
    });
  });

  it("passes status, tax and a manual total through", async () => {
    mocks.createInvoiceDal.mockResolvedValue(ok({ id: INVOICE, org_id: ORG }));
    await createInvoiceTool(ctx, {
      customer_id: CUSTOMER,
      items: [{ description: "Flat fee", unit_price: 300 }],
      tax_rate: 5,
      status: "paid",
      total_override: 250,
    });
    expect(mocks.createInvoiceDal).toHaveBeenCalledWith(
      expect.objectContaining({
        tax_rate: 5,
        status: "paid",
        total_override: 250,
      }),
      ctx,
    );
  });

  it("explains bad line items before touching anything", async () => {
    const run = (items: object[]) =>
      createInvoiceTool(ctx, { customer_id: CUSTOMER, items: items as never });
    expect((await run([{ quantity: 2 }])).summary).toBe(
      "Item 1 needs a product_id, or a description for a one-off item.",
    );
    expect((await run([{ description: "Fee" }])).summary).toBe(
      'Item 1 ("Fee") is a one-off item, so it needs a unit_price.',
    );
    mocks.getProductByIdDal.mockResolvedValue({
      data: null,
      error: "Product not found",
    });
    expect((await run([{ product_id: "nope" }])).summary).toBe(
      "Item 1: Product not found. Check the product_id with list_products.",
    );
    expect(mocks.createInvoiceDal).not.toHaveBeenCalled();
  });

  it("adds a new customer first, then invoices them", async () => {
    mocks.createCustomerDal.mockResolvedValue(ok(customer));
    mocks.createInvoiceDal.mockResolvedValue(ok({ id: INVOICE, org_id: ORG }));
    const result = await createInvoiceTool(ctx, {
      new_customer: { name: "Acme Corp", email: "billing@acme.test" },
      items: [{ product_id: PRODUCT }],
    });
    expect(mocks.createCustomerDal).toHaveBeenCalledWith(
      { name: "Acme Corp", email: "billing@acme.test", status: "active" },
      ctx,
    );
    expect(mocks.createInvoiceDal.mock.calls[0][0].customer_id).toBe(CUSTOMER);
    expect(result.summary).toMatch(
      /^Added customer Acme Corp and created invoice/,
    );
  });

  it("stops when the new customer or the invoice can't be created", async () => {
    mocks.createCustomerDal.mockResolvedValue(
      err({
        reason:
          "Usage limit reached, limit: 4 customers total with your plan. Consider upgrading",
      }),
    );
    const noCustomer = await createInvoiceTool(ctx, {
      new_customer: { name: "Acme Corp", email: "billing@acme.test" },
      items: [{ product_id: PRODUCT }],
    });
    expect(noCustomer.isError).toBe(true);
    expect(mocks.createInvoiceDal).not.toHaveBeenCalled();

    mocks.createInvoiceDal.mockResolvedValue(
      err({
        reason:
          "Usage limit reached, limit: 5 a month with your plan. Consider upgrading.",
      }),
    );
    const limited = await createInvoiceTool(ctx, {
      customer_id: CUSTOMER,
      items: [{ product_id: PRODUCT }],
    });
    expect(limited.summary).toBe(
      "Usage limit reached, limit: 5 a month with your plan. Consider upgrading.",
    );
  });
});

describe("update_invoice", () => {
  it("keeps what isn't passed", async () => {
    mocks.getInvoiceById.mockResolvedValue(
      found({
        total_override: 90,
        items: [
          {
            id: "i2",
            invoice_id: INVOICE,
            product_id: null,
            description: "Call-out",
            quantity: "1",
            unit_price: "75.00",
            product: null,
          },
        ],
      }),
    );
    mocks.updateInvoiceDal.mockResolvedValue(ok({ id: INVOICE }));
    const result = await updateInvoiceTool(ctx, {
      invoice_id: INVOICE,
      status: "paid",
    });
    expect(mocks.updateInvoiceDal).toHaveBeenCalledWith(
      {
        id: INVOICE,
        customer_id: CUSTOMER,
        items: [
          {
            product_id: null,
            description: "Call-out",
            quantity: 1,
            unit_price: 75,
          },
        ],
        tax_rate: 5,
        status: "paid",
        total_override: 90,
      },
      ctx,
    );
    expect(result.summary).toContain("Updated invoice");
  });

  it("replaces the items, customer and tax, and clears a manual total", async () => {
    mocks.getInvoiceById.mockResolvedValue(
      found({ tax_rate: null, total_override: 80 }),
    );
    mocks.updateInvoiceDal.mockResolvedValue(ok({ id: INVOICE }));
    await updateInvoiceTool(ctx, {
      invoice_id: INVOICE,
      customer_id: "other",
      items: [{ description: "Fee", unit_price: 10, quantity: 2 }],
      tax_rate: 13,
      total_override: null,
    });
    expect(mocks.updateInvoiceDal).toHaveBeenCalledWith(
      {
        id: INVOICE,
        customer_id: "other",
        items: [
          { product_id: null, description: "Fee", quantity: 2, unit_price: 10 },
        ],
        tax_rate: 13,
        status: "draft",
        total_override: null,
      },
      ctx,
    );
  });

  it("defaults a missing tax rate and manual total", async () => {
    mocks.getInvoiceById.mockResolvedValue(
      found({ tax_rate: undefined, total_override: undefined }),
    );
    mocks.updateInvoiceDal.mockResolvedValue(ok({ id: INVOICE }));
    await updateInvoiceTool(ctx, { invoice_id: INVOICE });
    expect(mocks.updateInvoiceDal.mock.calls[0][0]).toMatchObject({
      tax_rate: 0,
      total_override: null,
    });
  });

  it("reports a missing invoice, bad items or a failed save", async () => {
    mocks.updateInvoiceDal.mockResolvedValue(
      err({ reason: "One or more products are not found or are disabled" }),
    );
    expect(
      (await updateInvoiceTool(ctx, { invoice_id: INVOICE })).summary,
    ).toBe("One or more products are not found or are disabled.");
    expect(
      (await updateInvoiceTool(ctx, { invoice_id: INVOICE, items: [{}] }))
        .summary,
    ).toContain("needs a product_id");
    mocks.getInvoiceById.mockResolvedValue({
      data: null,
      error: "Invoice not found",
    });
    expect(
      (await updateInvoiceTool(ctx, { invoice_id: INVOICE })).isError,
    ).toBe(true);
  });
});

describe("update_invoice_status", () => {
  it("changes the status and returns the card", async () => {
    mocks.updateInvoiceStatusDal.mockResolvedValue(ok({ id: INVOICE }));
    mocks.getInvoiceById.mockResolvedValue(found({ status: "paid" }));
    const result = await updateInvoiceStatusTool(ctx, {
      invoice_id: INVOICE,
      status: "paid",
    });
    expect(mocks.updateInvoiceStatusDal).toHaveBeenCalledWith(
      INVOICE,
      "paid",
      ctx,
    );
    expect(result.summary).toBe(`Invoice ${INVOICE} is now paid.`);
    mocks.updateInvoiceStatusDal.mockResolvedValue(
      err({ reason: "Db failed to update invoice" }),
    );
    expect(
      (
        await updateInvoiceStatusTool(ctx, {
          invoice_id: INVOICE,
          status: "sent",
        })
      ).isError,
    ).toBe(true);
  });
});

describe("delete_invoice", () => {
  it("previews, then deletes only with confirm", async () => {
    const preview = await deleteInvoiceTool(ctx, { invoice_id: INVOICE });
    expect(preview.data.status).toBe("needs_confirmation");
    expect(preview.summary).toContain("can't be undone");
    expect(mocks.deleteInvoiceDal).not.toHaveBeenCalled();
    mocks.deleteInvoiceDal.mockResolvedValue(ok({ id: INVOICE }));
    expect(
      (await deleteInvoiceTool(ctx, { invoice_id: INVOICE, confirm: true }))
        .summary,
    ).toBe(`Deleted invoice ${INVOICE}.`);
    mocks.deleteInvoiceDal.mockResolvedValue(
      err({ reason: "Db failed to delete invoice" }),
    );
    expect(
      (await deleteInvoiceTool(ctx, { invoice_id: INVOICE, confirm: true }))
        .isError,
    ).toBe(true);
    mocks.getInvoiceById.mockResolvedValue({
      data: null,
      error: "Invoice not found",
    });
    expect(
      (await deleteInvoiceTool(ctx, { invoice_id: INVOICE })).isError,
    ).toBe(true);
  });
});

describe("send_invoice", () => {
  it("refuses when the plan can't email invoices", async () => {
    const result = await sendInvoiceTool(ctxWith(["stats"]), {
      invoice_id: INVOICE,
      confirm: true,
    });
    expect(result.data.status).toBe("send_email_not_in_plan");
    expect(mocks.sendInvoiceDal).not.toHaveBeenCalled();
  });

  it("previews who it goes to, and warns about a resend", async () => {
    const draft = await sendInvoiceTool(ctx, { invoice_id: INVOICE });
    expect(draft.summary).toContain("to Acme Corp <billing@acme.test>");
    expect(draft.summary).not.toContain("emails it again");
    mocks.getInvoiceById.mockResolvedValue(found({ status: "paid" }));
    const paid = await sendInvoiceTool(ctx, { invoice_id: INVOICE });
    expect(paid.summary).toContain(
      "already marked paid, so this emails it again",
    );
    expect(mocks.sendInvoiceDal).not.toHaveBeenCalled();
  });

  it("sends with confirm and returns the sent invoice", async () => {
    mocks.sendInvoiceDal.mockResolvedValue(ok({ id: INVOICE }));
    const result = await sendInvoiceTool(ctx, {
      invoice_id: INVOICE,
      confirm: true,
    });
    expect(mocks.sendInvoiceDal).toHaveBeenCalledWith(INVOICE, ctx);
    expect(result.summary).toBe(
      `Emailed invoice ${INVOICE} ($105.00) to billing@acme.test. It's now marked sent.`,
    );
    expect(result.data.status).toBe("sent");
  });

  it("reports a failed send or a missing invoice", async () => {
    mocks.sendInvoiceDal.mockResolvedValue(
      err({ reason: "Failed to send invoice", message: "SES down" }),
    );
    expect(
      (await sendInvoiceTool(ctx, { invoice_id: INVOICE, confirm: true }))
        .summary,
    ).toBe("Failed to send invoice: SES down");
    mocks.getInvoiceById.mockResolvedValue({
      data: null,
      error: "Invoice not found",
    });
    expect((await sendInvoiceTool(ctx, { invoice_id: INVOICE })).isError).toBe(
      true,
    );
  });
});

describe("get_invoice_pdf", () => {
  it("attaches the PDF as a resource, not in the JSON", async () => {
    mocks.getInvoicePdfDal.mockResolvedValue(
      ok({ pdf: Buffer.from("%PDF"), invoice: { total: "105.00" } }),
    );
    const result = await getInvoicePdfTool(ctx, { invoice_id: INVOICE });
    expect(result.summary).toContain(
      "($105.00) is attached as invoice-33333333.pdf",
    );
    expect(result.data).toEqual({
      invoice_id: INVOICE,
      filename: "invoice-33333333.pdf",
      mime_type: "application/pdf",
      size_bytes: 4,
    });
    expect(result.resources).toEqual([
      {
        uri: `invoicepro://invoices/${INVOICE}/invoice-33333333.pdf`,
        mimeType: "application/pdf",
        blob: Buffer.from("%PDF").toString("base64"),
      },
    ]);
    mocks.getInvoicePdfDal.mockResolvedValue(
      err({ reason: "Invoice not found" }),
    );
    expect(
      (await getInvoicePdfTool(ctx, { invoice_id: INVOICE })).isError,
    ).toBe(true);
  });
});
