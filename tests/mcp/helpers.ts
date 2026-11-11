import type { CallerContext } from "@/mcp/caller";

export const ORG = "org_1";
export const CUSTOMER = "11111111-1111-4111-8111-111111111111";
export const PRODUCT = "22222222-2222-4222-8222-222222222222";
export const INVOICE = "33333333-3333-4333-8333-333333333333";

/** A caller in org_1 with the given plan features. */
export function ctxWith(
  features: string[] = ["stats", "send_email"],
  role = "org:admin",
): CallerContext {
  const set = new Set(features);
  return {
    orgId: ORG,
    userId: "user_1",
    orgRole: role,
    org: { org_id: ORG, name: "Pat's Plumbing", slug: "pats", role },
    features: set,
    has: ({ feature }) => set.has(feature),
  };
}

export const customer = {
  id: CUSTOMER,
  name: "Acme Corp",
  email: "billing@acme.test",
  phone: "403-555-0100",
  address_line1: "1 Main St",
  address_line2: null,
  city: "Calgary",
  region: "AB",
  postal_code: "T2P 1J9",
  country: "Canada",
  org_id: ORG,
  status: "active" as const,
};

export const product = {
  id: PRODUCT,
  name: "Consulting",
  price: 50,
  org_id: ORG,
  status: "active" as const,
};

export function fullInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE,
    customer_id: CUSTOMER,
    total: 105,
    tax_rate: 5,
    total_override: null,
    status: "draft" as "draft" | "sent" | "paid",
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
        product,
      },
    ],
    ...overrides,
  };
}

/** neverthrow-like results, as the DAL returns them. */
export const ok = <T>(value: T) => ({
  isOk: () => true,
  isErr: () => false,
  value,
});
export const err = (error: { reason: string; message?: string }) => ({
  isOk: () => false,
  isErr: () => true,
  error,
});
