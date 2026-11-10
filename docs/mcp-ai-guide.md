# Using InvoicePro from an AI assistant

InvoicePro has an MCP server at **`https://www.invoicepro.patmac.ca/api/mcp`**. Connect it to Claude, ChatGPT, Gemini, Muse or any other app that supports MCP connectors, and the assistant can do everything the app does: add and edit customers (with phone and address), manage products and prices, create and edit invoices (catalog items, one-off items, tax, a manual total), mark them sent or paid, email them, download PDFs, read your stats and set your logo.

The rules below are sent to every assistant automatically when it connects (the server's MCP `instructions`, in `src/mcp/instructions.ts`), so you don't need to paste anything. They're here so you know what to expect.

## Connecting

1. In your AI app, add a custom connector with the URL `https://www.invoicepro.patmac.ca/api/mcp`.
2. When it asks, sign in with your InvoicePro account. The assistant only ever works in your own organizations, with the same plan limits as the app.
3. Ask something like *"Invoice Acme for 3 hours of consulting and a $75 call-out fee"* or *"Which invoices are still unpaid?"*

### Claude and ChatGPT

Both register themselves with InvoicePro's sign-in (Clerk) and need only the URL. In both, invoices show up as an **interactive invoice card**: you can edit the customer, line items, tax, status or a manual total right in the chat, press **Send invoice** (it asks you to confirm first), download the PDF, or open the invoice in InvoicePro.

### Gemini

Gemini's custom apps (gemini.google.com and the Gemini app, with a personal Google account) connect with just the URL: add a custom app, paste the URL, leave **Advanced features** empty, and sign in. InvoicePro tells Gemini which scopes to ask for (`profile email offline_access`); `offline_access` gets it the refresh token Google's account linking needs. Gemini doesn't show the card; it uses the same tools and answers in text.

If Gemini asks for credentials under **Advanced features** anyway, create an OAuth client for it in Clerk (see below) with Gemini's redirect URI, and enter its Client ID and secret with:

- **Authorization URL:** `https://<your Clerk Frontend API>/oauth/authorize`
- **Token URL:** `https://<your Clerk Frontend API>/oauth/token`
- **Scopes:** `profile email offline_access`

### Apps that ask for a Client ID (Muse)

Some apps, such as Muse, don't register themselves and show a **Client ID** field next to the server URL. For those, create a client once:

1. In the [Clerk dashboard](https://dashboard.clerk.com), open InvoicePro's application, then **Configure → OAuth applications → Add OAuth application**.
2. Name it after the app (e.g. *Muse*), make it a **public** client (no secret; it uses PKCE), and turn on the `profile` and `email` scopes (plus `offline_access` if offered, so the app stays signed in).
3. Add the app's redirect / callback URL as a redirect URI.
4. Save, copy the **Client ID** into the app's Client ID field with the server URL above, and add the ID to `MCP_ALLOWED_OAUTH_CLIENT_IDS`.

## What the assistant does, and what it asks first

- **New customers and products.** It looks people and items up first. If someone or something isn't there, it asks before adding them. You can give it a phone number and address for a new customer. An item can go into the catalog, or onto just this invoice as a one-off line item.
- **Prices.** Changing a product's price affects invoices made from then on. Existing invoices keep their price unless you ask it to edit them.
- **Manual totals.** Only when you name a total. Clearing it goes back to line items plus tax.
- **Sending.** It always shows you who the invoice goes to and the amount, and sends only after you say yes. If the invoice was already sent or paid, it says the email will go out again. If your plan doesn't include emailing invoices, it offers the PDF instead.
- **Deleting.** Invoices, customers and products are deleted only after you confirm. A deleted invoice is gone for good. A deleted customer or product leaves past invoices as they are.

## Tools

| Area | Tools |
| --- | --- |
| Organizations | `list_organizations`, `get_organization`, `get_stats`, `manage_logo` (admins) |
| Customers | `list_customers`, `get_customer`, `create_customer`, `update_customer`, `delete_customer` |
| Products | `list_products`, `create_product`, `update_product`, `delete_product` |
| Invoices | `list_invoices`, `get_invoice`, `create_invoice`, `update_invoice`, `update_invoice_status`, `send_invoice`, `delete_invoice`, `get_invoice_pdf` |

Prompts: `new_invoice`, `unpaid_invoices`, `send_invoice`, `monthly_summary`.
