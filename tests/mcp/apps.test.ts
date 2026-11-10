// @vitest-environment node
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import {
  cardResourceMeta,
  cardToolMeta,
  INVOICE_CARD,
  MCP_APP_MIME_TYPE,
  registerInvoiceCard,
} from "@/mcp/apps";
import { invoiceCardHtml } from "@/mcp/apps-ui";

/*
 * The invoice card, run for real in jsdom against a fake MCP Apps host: the
 * page posts JSON-RPC to its parent, the test answers like a host would.
 */

const INVOICE = "33333333-3333-4333-8333-333333333333";

const cardData = (overrides: Record<string, unknown> = {}) => ({
  invoice: {
    invoice_id: INVOICE,
    status: "draft",
    created_at: "2026-11-01T12:00:00.000Z",
    customer: {
      customer_id: "c1",
      name: "Acme Corp",
      email: "billing@acme.test",
      phone: "403-555-0100",
      address_line1: "1 Main St",
      address_line2: null,
      city: "Calgary",
      region: "AB",
      postal_code: "T2P 1J9",
      country: "Canada",
    },
    items: [
      {
        product_id: "p1",
        description: null,
        name: "Consulting",
        one_off: false,
        quantity: 2,
        unit_price: 50,
        amount: 100,
      },
      {
        product_id: null,
        description: "Call-out fee",
        name: "Call-out fee",
        one_off: true,
        quantity: 1,
        unit_price: 75,
        amount: 75,
      },
    ],
    tax_rate: 5,
    subtotal: 175,
    tax: 8.75,
    computed_total: 183.75,
    total_override: null,
    total: 183.75,
    app_url: `https://www.invoicepro.patmac.ca/invoices/${INVOICE}`,
  },
  organization: { org_id: "org_1", name: "Pat's Plumbing" },
  can_send: true,
  mode: "view",
  ...overrides,
});

type Rpc = {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
};

/** Loads the card in a fake host frame; returns helpers to drive it. */
function mountCard(answer: (msg: Rpc) => unknown = () => ({})): {
  window: JSDOM["window"];
  sent: Rpc[];
  deliver: (msg: Rpc) => void;
  click: (label: string) => void;
  text: () => string;
  flush: () => Promise<void>;
} {
  const dom = new JSDOM(invoiceCardHtml(), {
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const sent: Rpc[] = [];
  const fakeParent = {
    postMessage(msg: Rpc) {
      sent.push(msg);
      if (msg.id !== undefined) {
        const result = answer(msg);
        setTimeout(() =>
          deliver({ jsonrpc: "2.0", id: msg.id, ...{ result } }),
        );
      }
    },
  };
  Object.defineProperty(window, "parent", { value: fakeParent });
  function deliver(msg: Rpc) {
    window.dispatchEvent(
      new window.MessageEvent("message", {
        data: msg,
        source: fakeParent as unknown as Window,
      }),
    );
  }
  const script = window.document.querySelector("script")?.textContent ?? "";
  window.eval(script);
  return {
    window,
    sent,
    deliver,
    click(label: string) {
      const button = [...window.document.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === label,
      );
      if (!button) throw new Error(`No button "${label}"`);
      button.click();
    },
    text: () => window.document.getElementById("app")?.textContent ?? "",
    flush: () => new Promise((r) => setTimeout(r, 5)),
  };
}

const toolCalls = (sent: Rpc[]) =>
  sent
    .filter((m) => m.method === "tools/call")
    .map(
      (m) => m.params as { name: string; arguments: Record<string, unknown> },
    );

describe("invoice card metadata", () => {
  it("links tools to the card for MCP Apps and ChatGPT", () => {
    expect(cardToolMeta()).toMatchObject({
      ui: { resourceUri: INVOICE_CARD.uri },
      "ui/resourceUri": INVOICE_CARD.uri,
      "openai/outputTemplate": INVOICE_CARD.uri,
      "openai/widgetAccessible": true,
    });
    expect(cardResourceMeta().ui.csp).toEqual({
      connectDomains: [],
      resourceDomains: [],
    });
  });

  it("registers the card as a ui:// resource with no user data", async () => {
    const registerResource = vi.fn();
    registerInvoiceCard({ registerResource } as never);
    const [name, uri, meta, read] = registerResource.mock.calls[0];
    expect(name).toBe("invoice-card");
    expect(uri).toBe(INVOICE_CARD.uri);
    expect(meta.mimeType).toBe(MCP_APP_MIME_TYPE);
    const contents = await read(new URL(INVOICE_CARD.uri));
    expect(contents.contents[0].text).toBe(invoiceCardHtml());
    expect(contents.contents[0].text).not.toContain("Acme");
  });

  it("keeps the client script free of template literals", () => {
    const script = invoiceCardHtml().split("<script>")[1];
    expect(script).not.toContain("`");
  });
});

describe("invoice card in an MCP Apps host", () => {
  it("initializes, then renders the invoice from the tool result", async () => {
    const card = mountCard();
    expect(card.sent[0]).toMatchObject({ method: "ui/initialize" });
    expect(card.text()).toContain("Loading invoice");
    await card.flush();
    expect(
      card.sent.some((m) => m.method === "ui/notifications/initialized"),
    ).toBe(true);

    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData() },
    });
    const text = card.text();
    expect(text).toContain("Pat's Plumbing");
    expect(text).toContain("Acme Corp");
    expect(text).toContain("1 Main St");
    expect(text).toContain("Calgary, AB T2P 1J9");
    expect(text).toContain("Call-out fee (one-off)");
    expect(text).toContain("$183.75");
    expect(text).toContain("Send invoice");
  });

  it("confirms in the card before sending, then sends with confirm: true", async () => {
    const card = mountCard((msg) =>
      msg.method === "tools/call"
        ? {
            content: [{ type: "text", text: "Emailed invoice." }],
            structuredContent: cardData({
              invoice: { ...cardData().invoice, status: "sent" },
            }),
          }
        : {},
    );
    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData() },
    });
    card.click("Send invoice");
    expect(toolCalls(card.sent)).toHaveLength(0);
    expect(card.text()).toContain(
      "Email this invoice for $183.75 to Acme Corp <billing@acme.test>",
    );

    card.click("Yes, send it");
    await card.flush();
    expect(toolCalls(card.sent)).toEqual([
      {
        name: "send_invoice",
        arguments: { org_id: "org_1", invoice_id: INVOICE, confirm: true },
      },
    ]);
    expect(card.text()).toContain("Emailed invoice.");
  });

  it("opens the send confirmation when the model asked for a preview", () => {
    const card = mountCard();
    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData({ status: "needs_confirmation" }) },
    });
    expect(card.text()).toContain("Yes, send it");
  });

  it("edits line items, tax and a manual total, then saves the full invoice", async () => {
    const card = mountCard((msg) => {
      const params = msg.params as { name?: string } | undefined;
      if (params?.name === "list_customers") {
        return {
          structuredContent: {
            customers: [
              {
                customer_id: "c1",
                name: "Acme Corp",
                email: "billing@acme.test",
              },
              { customer_id: "c2", name: "Beta LLC", email: "ap@beta.test" },
            ],
          },
        };
      }
      if (params?.name === "list_products") {
        return {
          structuredContent: {
            products: [{ product_id: "p1", name: "Consulting", price: 50 }],
          },
        };
      }
      return {
        content: [{ type: "text", text: "Updated." }],
        structuredContent: cardData(),
      };
    });
    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData() },
    });
    card.click("Edit");
    await card.flush();
    const doc = card.window.document;

    const customerSelect = doc.getElementById(
      "ip-customer",
    ) as HTMLSelectElement;
    expect([...customerSelect.options].map((o) => o.textContent)).toContain(
      "Beta LLC <ap@beta.test>",
    );
    customerSelect.value = "c2";
    customerSelect.dispatchEvent(new card.window.Event("change"));

    const qty = doc.querySelector(
      '[aria-label="Quantity for line 1"]',
    ) as HTMLInputElement;
    qty.value = "3";
    qty.dispatchEvent(new card.window.Event("input"));
    expect(doc.getElementById("ip-totals")?.textContent).toContain("$225.00");

    const tax = doc.getElementById("ip-tax") as HTMLInputElement;
    tax.value = "0";
    tax.dispatchEvent(new card.window.Event("input"));
    const override = doc.getElementById("ip-override") as HTMLInputElement;
    override.value = "200";
    override.dispatchEvent(new card.window.Event("input"));
    expect(doc.getElementById("ip-totals")?.textContent).toContain(
      "Total due (manual)$200.00",
    );

    card.click("+ One-off item");
    const desc = doc.querySelector(
      '[aria-label="Description for line 3"]',
    ) as HTMLInputElement;
    desc.value = "Parts";
    desc.dispatchEvent(new card.window.Event("input"));
    const price = doc.querySelector(
      '[aria-label="Unit price for line 3"]',
    ) as HTMLInputElement;
    price.value = "12.5";
    price.dispatchEvent(new card.window.Event("input"));

    card.click("Save");
    await card.flush();
    const save = toolCalls(card.sent).find((c) => c.name === "update_invoice");
    expect(save?.arguments).toEqual({
      org_id: "org_1",
      invoice_id: INVOICE,
      customer_id: "c2",
      status: "draft",
      tax_rate: 0,
      total_override: 200,
      items: [
        { product_id: "p1", quantity: 3, unit_price: 50 },
        { description: "Call-out fee", quantity: 1, unit_price: 75 },
        { description: "Parts", quantity: 1, unit_price: 12.5 },
      ],
    });
    expect(card.text()).toContain("Saved.");
  });

  it("won't save a one-off line with no description", async () => {
    const card = mountCard((msg) =>
      (msg.params as { name?: string })?.name === "list_products"
        ? { structuredContent: { products: [] } }
        : { structuredContent: { customers: [] } },
    );
    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData({ mode: "edit" }) },
    });
    await card.flush();
    card.click("+ One-off item");
    card.click("Save");
    expect(card.text()).toContain("Line 3 needs a product or a description.");
    expect(toolCalls(card.sent).some((c) => c.name === "update_invoice")).toBe(
      false,
    );
  });

  it("shows a tool error from the host", async () => {
    const card = mountCard((msg) =>
      msg.method === "tools/call"
        ? {
            isError: true,
            content: [{ type: "text", text: "Usage limit reached." }],
          }
        : {},
    );
    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData() },
    });
    const status = card.window.document.querySelector(
      'select[aria-label="Status"]',
    ) as HTMLSelectElement;
    status.value = "paid";
    status.dispatchEvent(new card.window.Event("change"));
    await card.flush();
    expect(toolCalls(card.sent)[0]).toEqual({
      name: "update_invoice_status",
      arguments: { org_id: "org_1", invoice_id: INVOICE, status: "paid" },
    });
    expect(
      card.window.document.querySelector('[role="alert"]')?.textContent,
    ).toBe("Usage limit reached.");
  });

  it("hides Send when the plan can't email invoices", () => {
    const card = mountCard();
    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData({ can_send: false }) },
    });
    expect(card.text()).not.toContain("Send invoice");
    expect(card.text()).toContain("isn't included in this organization's plan");
  });

  it("downloads the PDF from the attached resource", async () => {
    const card = mountCard((msg) =>
      msg.method === "tools/call"
        ? {
            structuredContent: { filename: "invoice-33333333.pdf" },
            content: [
              { type: "text", text: "PDF attached." },
              {
                type: "resource",
                resource: {
                  uri: "x",
                  mimeType: "application/pdf",
                  blob: "JVBERi0=",
                },
              },
            ],
          }
        : {},
    );
    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData() },
    });
    card.click("PDF");
    await card.flush();
    expect(toolCalls(card.sent)[0].name).toBe("get_invoice_pdf");
    expect(card.text()).toContain("Downloading invoice-33333333.pdf");
  });

  it("opens the invoice in the app through the host", async () => {
    const card = mountCard();
    card.deliver({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: cardData() },
    });
    card.click("Open in InvoicePro");
    expect(card.sent.find((m) => m.method === "ui/open-link")?.params).toEqual({
      url: `https://www.invoicepro.patmac.ca/invoices/${INVOICE}`,
    });
  });
});

describe("invoice card in ChatGPT (OpenAI Apps SDK)", () => {
  it("renders window.openai.toolOutput and calls tools through it", async () => {
    const dom = new JSDOM(invoiceCardHtml(), { runScripts: "outside-only" });
    const callTool = vi.fn(async () => ({
      structuredContent: cardData({
        invoice: { ...cardData().invoice, status: "paid" },
      }),
      content: [{ type: "text", text: "Invoice is now paid." }],
    }));
    Object.assign(dom.window, {
      openai: { toolOutput: cardData(), theme: "dark", callTool },
    });
    dom.window.eval(
      dom.window.document.querySelector("script")?.textContent ?? "",
    );
    expect(dom.window.document.documentElement.getAttribute("data-theme")).toBe(
      "dark",
    );
    expect(dom.window.document.getElementById("app")?.textContent).toContain(
      "Acme Corp",
    );

    const status = dom.window.document.querySelector(
      'select[aria-label="Status"]',
    ) as HTMLSelectElement;
    status.value = "paid";
    status.dispatchEvent(new dom.window.Event("change"));
    await new Promise((r) => setTimeout(r, 5));
    expect(callTool).toHaveBeenCalledWith("update_invoice_status", {
      org_id: "org_1",
      invoice_id: INVOICE,
      status: "paid",
    });
    expect(dom.window.document.getElementById("app")?.textContent).toContain(
      "Invoice is now paid.",
    );
  });
});
