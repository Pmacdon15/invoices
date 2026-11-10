import type {
  Customer,
  FullInvoice,
  Invoice,
  PaginatedValue,
  Product,
  Result,
} from "@/dal/types";

export const ORG = "org_1";

export const customer = (over: Partial<Customer> = {}): Customer => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Acme Corp",
  email: "billing@acme.com",
  org_id: ORG,
  status: "active",
  ...over,
});

export const product = (over: Partial<Product> = {}): Product => ({
  id: "22222222-2222-4222-8222-222222222222",
  name: "Consulting",
  price: 100,
  org_id: ORG,
  status: "active",
  ...over,
});

export const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "33333333-3333-4333-8333-333333333333",
  customer_id: customer().id,
  total: 250,
  tax_rate: 0,
  status: "draft",
  org_id: ORG,
  created_at: "2026-01-15T12:00:00.000Z",
  customer: customer(),
  ...over,
});

export const fullInvoice = (over: Partial<FullInvoice> = {}): FullInvoice => ({
  ...invoice(),
  customer: customer(),
  items: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      invoice_id: invoice().id,
      product_id: product().id,
      quantity: 2,
      unit_price: 100,
      product: product(),
    },
  ],
  ...over,
});

export function page<T>(
  data: T[],
  over: Partial<PaginatedValue<T>> = {},
): PaginatedValue<T> {
  return {
    data,
    currentPage: 1,
    totalPages: 1,
    totalCount: data.length,
    ...over,
  };
}

export const ok = <T>(data: T): Promise<Result<T>> =>
  Promise.resolve({ data, error: null });

export const fail = <T>(error: string): Promise<Result<T>> =>
  Promise.resolve({ data: null, error });
