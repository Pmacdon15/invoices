<!-- copilot-noop: trigger vercel build 2 -->

# Invoices App

A robust B2B SaaS application for managing invoices, customers, and products, built with Next.js 16, Neon, and Clerk.

## Overview

This application provides a multi-tenant, organization-based environment to manage your billing and customer data. It comes with built-in subscription tier limits controlled by your Clerk dashboard[...]

### Services Used
- **Authentication & Billing**: [Clerk](https://clerk.com/)
- **Database**: [Neon](https://neon.tech/) (Serverless Postgres)
- **Emails**: [AWS SES](https://aws.amazon.com/ses/)

---

## Environment Variable Setup

To get the project running locally or in production, you must configure your `.env.local` file. Copy the block below into your `.env.local` file and fill in the missing credentials.

```env
# ==========================================
# CLERK AUTHENTICATION & WEBHOOKS
# ==========================================
# Get these from your Clerk Dashboard -> API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# Get this from Clerk Dashboard -> Webhooks -> Add Endpoint
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# ==========================================
# CLERK SUBSCRIPTION PLAN CONFIGURATION
# ==========================================
# The application uses these slugs to detect which plan an organization is on.
# You configure these exact slugs as "Features" inside the Clerk Billing Dashboard.

# Pro Plan Features
NEXT_PUBLIC_CLERK_PRO_CUSTOMERS_SLUG="create_up_to_100_customers"
NEXT_PUBLIC_CLERK_PRO_PRODUCTS_SLUG="create_up_to_100_products"
NEXT_PUBLIC_CLERK_PRO_INVOICES_SLUG="create_up_to_100_invoices_a_month"
NEXT_PUBLIC_PRO_LIMIT="100"

# Basic Plan Features
NEXT_PUBLIC_CLERK_BASIC_CUSTOMERS_SLUG="create_up_to_8_customers"
NEXT_PUBLIC_CLERK_BASIC_PRODUCTS_SLUG="create_up_to_10_products"
NEXT_PUBLIC_CLERK_BASIC_INVOICES_SLUG="create_up_to_10_invoices_a_month"
NEXT_PUBLIC_BASIC_CUSTOMER_LIMIT="8"
NEXT_PUBLIC_BASIC_PRODUCT_LIMIT="10"
NEXT_PUBLIC_BASIC_INVOICE_LIMIT="10"

# Free Plan Features (Default fallback if no features present)
NEXT_PUBLIC_CLERK_FREE_CUSTOMERS_SLUG="create_up_to_4_customers"
NEXT_PUBLIC_CLERK_FREE_PRODUCTS_SLUG="create_up_to_5_products"
NEXT_PUBLIC_CLERK_FREE_INVOICES_SLUG="create_up_to_5_invoices_a_month"
NEXT_PUBLIC_FREE_CUSTOMER_LIMIT="4"
NEXT_PUBLIC_FREE_PRODUCT_LIMIT="5"
NEXT_PUBLIC_FREE_INVOICE_LIMIT="5"

# ==========================================
# NEON DATABASE CONNECTION
# ==========================================
# Go to Neon Dashboard -> Project -> Dashboard -> Connection Details
# Copy the `.env` format they provide and paste it here.
DATABASE_URL=postgresql://user:password@endpoint...
DATABASE_URL_UNPOOLED=postgresql://user:password@endpoint...
PGDATABASE=
PGHOST=
PGPASSWORD=
PGUSER=
POSTGRES_DATABASE=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_PRISMA_URL=
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_URL_NO_SSL=
POSTGRES_USER=

# ==========================================
# AWS SES (EMAIL)
# ==========================================
# Configure these to send out invoice emails
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
SES_FROM_EMAIL=invoices@yourdomain.com
```

---

## Configuring Limits in Clerk

This project is built to rely on **Clerk Organization Billing**. By default, if an organization has no paid subscription, they are bound to the "Free Plan Features" limit defined in your `.env`.

When an organization subscribes to a plan (e.g., "Basic" or "Pro"), Clerk assigns them "Features". 

**To set this up:**
1. Navigate to the **Billing** section of your Clerk Dashboard.
2. Create your Plans (e.g., Basic and Pro).
3. Inside each plan, create Features. Ensure the "Feature ID" in Clerk matches the slugs configured in your `.env` file (e.g., `create_up_to_100_customers`).
4. The application dynamically reads these slugs and grants the corresponding integer limits!

---

## AI connector (MCP)

`/api/mcp` is an [MCP](https://modelcontextprotocol.io) server that Claude, ChatGPT, Gemini, Muse or any MCP client can connect to. Through it the assistant can do everything the app does: customers (with phone and address), products and prices, invoices (catalog or one-off line items, tax, a manual total, status), emailing invoices, PDFs, stats and the logo. In Claude and ChatGPT, invoices show as a display-only card; you ask the assistant for changes, the PDF or a link to the invoice. See [docs/mcp-ai-guide.md](docs/mcp-ai-guide.md) for how to connect each app and what the assistant asks before acting.

How it works:

- **Auth.** OAuth through this app's Clerk instance. A request without a token gets a `401` whose `WWW-Authenticate` header points to `/.well-known/oauth-protected-resource/api/mcp`, which names Clerk as the authorization server. Clerk's own discovery documents are mirrored at `/.well-known/oauth-authorization-server` and `/.well-known/openid-configuration`. Every tool runs for the token's verified user in an organization they belong to (`org_id` picks one when there are several), with that organization's Clerk Billing features. Plan limits, `send_email` and the `stats` app-access check apply exactly as in the app, because the tools call the same `src/dal` functions. Each DAL function takes an optional `AuthContext` (`src/lib/auth-context.ts`); the web app leaves it out and uses `auth.protect()`.
- **Every client.** Bearer in any letter case, CORS on every response, plain JSON for clients that don't accept event streams, and no tool-list change notifications. Tool input schemas are advertised in the JSON Schema subset Gemini accepts (`src/mcp/portable-schema.ts`). The client code is in `src/mcp/http.ts`.
- **Confirmations.** `send_invoice`, `delete_invoice`, `delete_customer` and `delete_product` return a preview unless called with `confirm: true`, and the server instructions tell the assistant to ask the user in between.
- **Cache.** Writes from the MCP server expire the same cache tags as the server actions (`revalidateTag(tag, { expire: 0 })`). Reads right after a write in the same request skip the cache.
- **The card.** `src/mcp/apps.ts` and `src/mcp/apps-ui.ts`: an MCP Apps (`ui://`) resource, also linked for the OpenAI Apps SDK. It's self-contained, display-only HTML that loads nothing from outside and calls no tools.

Setup:

1. Run `migrations/2026-11-10-mcp-server.sql` once on an existing database. It adds the customer phone and address columns, one-off line item descriptions and the manual invoice total. `schema.sql` already includes them.
2. In the Clerk dashboard's OAuth settings, turn on **Publish CIMD support** and **Publish DCR support**, so apps can connect with just the URL.
3. Set the environment variables below in production.

```env
# Comma-separated OAuth client IDs allowed to use the MCP server, or * for any.
# Required in production: when unset there, every token is refused, because
# dynamic client registration lets anyone register a client on the Clerk instance.
MCP_ALLOWED_OAUTH_CLIENT_IDS=*
# Whether a token's audience must be this server: enforce (production default), log, or off.
MCP_TOKEN_AUDIENCE=enforce
# The app's public URL, used for links in tool results (defaults to https://www.invoicepro.patmac.ca).
NEXT_PUBLIC_APP_URL=https://www.invoicepro.patmac.ca
```

Tests for all of it are in `tests/mcp/`. `route.test.ts` drives the endpoint over HTTP, and `apps.test.ts` runs the card in jsdom against a fake host.

---

## Getting Started

First, install dependencies and run the development server:

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Running Tests

Run the unit test suite with:

```bash
bun run test
```

Use `bun run test:watch` while developing to rerun tests as files change.

---

## License & Commercial Use

This software is free for personal use.

If you intend to use this software to make money (commercial use), you **must**:
1. Completely **rebrand** the application (change logos, names, and branding).
2. Provide clear **attribution** to Patrick MacDonald and link to the GitHub profile: [pmacdon15](https://github.com/pmacdon15).

Once you have fulfilled these two conditions, you are free to use it for commercial purposes. See the `LICENSE` file for full details. 
