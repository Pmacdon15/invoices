import type { McpServer } from "@modelcontextprotocol/server";
import { invoiceCardHtml } from "@/mcp/apps-ui";

/*
 * InvoicePro's in-chat app: the invoice card. get_invoice, create_invoice,
 * update_invoice, update_invoice_status and send_invoice return the whole
 * invoice, and hosts that support apps show it as a card instead of JSON:
 * the invoice as the customer sees it, with a PDF download. It's view-only;
 * the assistant makes changes with the tools.
 *
 * Follows the MCP Apps extension (SEP-1865, `io.modelcontextprotocol/ui`):
 * the card is a `ui://` resource of type `text/html;profile=mcp-app`, linked
 * from each tool by `_meta.ui.resourceUri`. The OpenAI Apps SDK keys
 * (`openai/outputTemplate`, ...) point ChatGPT at the same resource. Hosts
 * without app support (Gemini, Muse, ...) ignore all of this and use the text
 * content, which says the same thing.
 */

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

export const INVOICE_CARD = {
  name: "invoice-card",
  uri: "ui://invoicepro/invoice-card.html",
  title: "Invoice",
  description:
    "Invoice card: the invoice as the customer sees it, with a PDF download. View-only; changes are made with the tools.",
  invoking: "Loading invoice…",
  invoked: "Invoice ready",
} as const;

/** `_meta` for a tool whose results the card renders. */
export function cardToolMeta() {
  return {
    ui: { resourceUri: INVOICE_CARD.uri },
    // Earlier drafts of SEP-1865 used a flat key; some hosts still read it.
    "ui/resourceUri": INVOICE_CARD.uri,
    "openai/outputTemplate": INVOICE_CARD.uri,
    // Lets the ChatGPT widget call get_invoice_pdf itself.
    "openai/widgetAccessible": true,
    "openai/toolInvocation/invoking": INVOICE_CARD.invoking,
    "openai/toolInvocation/invoked": INVOICE_CARD.invoked,
  };
}

/** `_meta` for the card's resource: no outside origins at all. */
export function cardResourceMeta() {
  return {
    ui: {
      csp: { connectDomains: [], resourceDomains: [] },
      prefersBorder: true,
    },
    "openai/widgetDescription": INVOICE_CARD.description,
    "openai/widgetPrefersBorder": true,
    "openai/widgetCSP": { connect_domains: [], resource_domains: [] },
  };
}

/** Registers the card's `ui://` resource. The HTML holds no user data. */
export function registerInvoiceCard(server: McpServer) {
  server.registerResource(
    INVOICE_CARD.name,
    INVOICE_CARD.uri,
    {
      title: INVOICE_CARD.title,
      description: INVOICE_CARD.description,
      mimeType: MCP_APP_MIME_TYPE,
      _meta: cardResourceMeta(),
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: MCP_APP_MIME_TYPE,
          text: invoiceCardHtml(),
          _meta: cardResourceMeta(),
        },
      ],
    }),
  );
}
