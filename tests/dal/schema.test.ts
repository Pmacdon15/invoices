import { describe, expect, it } from "vitest";
import {
  CreateCustomerSchema,
  CreateInvoiceSchema,
  CreateProductSchema,
  InvoiceStatusSchema,
  UpdateCustomerSchema,
  UpdateInvoiceSchema,
  UpdateInvoiceStatusSchema,
  UpdateProductSchema,
} from "@/dal/schema";

const customerId = "123e4567-e89b-42d3-a456-426614174000";
const productId = "123e4567-e89b-42d3-a456-426614174001";
const invoiceId = "123e4567-e89b-42d3-a456-426614174002";

const validCustomer = {
  name: "Acme Inc.",
  email: "billing@acme.example",
  status: "active",
};

const validProduct = {
  name: "Consulting",
  price: 125,
  status: "active",
};

const validInvoice = {
  customer_id: customerId,
  status: "draft",
  tax_rate: 5,
  items: [{ product_id: productId, quantity: 2, unit_price: 125 }],
};

describe("customer schemas", () => {
  it("accepts a valid customer", () => {
    expect(CreateCustomerSchema.safeParse(validCustomer).success).toBe(true);
  });

  it.each(["", "A"])('rejects a name that is too short: "%s"', (name) => {
    expect(
      CreateCustomerSchema.safeParse({ ...validCustomer, name }).success,
    ).toBe(false);
  });

  it.each([
    "not-an-email",
    "",
    "missing-domain@",
    "@example.com",
  ])("rejects an invalid email: %s", (email) => {
    expect(
      CreateCustomerSchema.safeParse({ ...validCustomer, email }).success,
    ).toBe(false);
  });

  it.each([
    "active",
    "disabled",
    "deleted",
  ])("accepts the %s status", (status) => {
    expect(
      CreateCustomerSchema.safeParse({ ...validCustomer, status }).success,
    ).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(
      CreateCustomerSchema.safeParse({ ...validCustomer, status: "archived" })
        .success,
    ).toBe(false);
  });

  it("requires a valid ID when updating a customer", () => {
    expect(
      UpdateCustomerSchema.safeParse({ ...validCustomer, id: customerId })
        .success,
    ).toBe(true);
    expect(
      UpdateCustomerSchema.safeParse({ ...validCustomer, id: "customer-1" })
        .success,
    ).toBe(false);
  });
});

describe("product schemas", () => {
  it("accepts a valid product and coerces a numeric string price", () => {
    const result = CreateProductSchema.safeParse({
      ...validProduct,
      price: "125.50",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.price).toBe(125.5);
  });

  it.each([
    0,
    -1,
    "0",
    "not-a-number",
  ])("rejects a non-positive or non-numeric price: %s", (price) => {
    expect(
      CreateProductSchema.safeParse({ ...validProduct, price }).success,
    ).toBe(false);
  });

  it("rejects a product name shorter than two characters", () => {
    expect(
      CreateProductSchema.safeParse({ ...validProduct, name: "X" }).success,
    ).toBe(false);
  });

  it("requires a valid ID when updating a product", () => {
    expect(
      UpdateProductSchema.safeParse({ ...validProduct, id: productId }).success,
    ).toBe(true);
    expect(
      UpdateProductSchema.safeParse({ ...validProduct, id: "product-1" })
        .success,
    ).toBe(false);
  });
});

describe("invoice schemas", () => {
  it("accepts a valid invoice", () => {
    expect(CreateInvoiceSchema.safeParse(validInvoice).success).toBe(true);
  });

  it("defaults a missing tax rate to zero", () => {
    const result = CreateInvoiceSchema.safeParse({
      ...validInvoice,
      tax_rate: undefined,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tax_rate).toBe(0);
  });

  it.each([0, 100])("accepts the %s percent tax boundary", (tax_rate) => {
    expect(
      CreateInvoiceSchema.safeParse({ ...validInvoice, tax_rate }).success,
    ).toBe(true);
  });

  it.each([-0.01, 100.01])("rejects tax rate %s", (tax_rate) => {
    expect(
      CreateInvoiceSchema.safeParse({ ...validInvoice, tax_rate }).success,
    ).toBe(false);
  });

  it("requires at least one line item", () => {
    expect(
      CreateInvoiceSchema.safeParse({ ...validInvoice, items: [] }).success,
    ).toBe(false);
  });

  it("rejects an invalid customer ID", () => {
    expect(
      CreateInvoiceSchema.safeParse({
        ...validInvoice,
        customer_id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it.each([
    0,
    -1,
    1.5,
    "not-a-number",
  ])("rejects invalid item quantity %s", (quantity) => {
    expect(
      CreateInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ ...validInvoice.items[0], quantity }],
      }).success,
    ).toBe(false);
  });

  it("rejects a negative line item price and accepts a zero price", () => {
    expect(
      CreateInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ ...validInvoice.items[0], unit_price: -0.01 }],
      }).success,
    ).toBe(false);
    expect(
      CreateInvoiceSchema.safeParse({
        ...validInvoice,
        items: [{ ...validInvoice.items[0], unit_price: 0 }],
      }).success,
    ).toBe(true);
  });

  it("requires a valid ID when updating an invoice", () => {
    expect(
      UpdateInvoiceSchema.safeParse({ ...validInvoice, id: invoiceId }).success,
    ).toBe(true);
    expect(
      UpdateInvoiceSchema.safeParse({ ...validInvoice, id: "invoice-1" })
        .success,
    ).toBe(false);
  });

  it.each(["draft", "sent", "paid"])("accepts invoice status %s", (status) => {
    expect(InvoiceStatusSchema.safeParse(status).success).toBe(true);
  });

  it("rejects an unsupported invoice status", () => {
    expect(InvoiceStatusSchema.safeParse("overdue").success).toBe(false);
  });

  it("validates status updates as a UUID and a known status", () => {
    expect(
      UpdateInvoiceStatusSchema.safeParse({ id: invoiceId, status: "paid" })
        .success,
    ).toBe(true);
    expect(
      UpdateInvoiceStatusSchema.safeParse({ id: "bad-id", status: "paid" })
        .success,
    ).toBe(false);
    expect(
      UpdateInvoiceStatusSchema.safeParse({ id: invoiceId, status: "overdue" })
        .success,
    ).toBe(false);
  });
});

describe("one-off line items and manual totals", () => {
  it("accepts an item with a description instead of a product", () => {
    const result = CreateInvoiceSchema.safeParse({
      ...validInvoice,
      total_override: "250.5",
      items: [
        {
          product_id: null,
          description: " Call-out ",
          quantity: 1,
          unit_price: 75,
        },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.items[0].description).toBe("Call-out");
    expect(result.data?.total_override).toBe(250.5);
  });

  it("needs a product or a description on every item", () => {
    const result = CreateInvoiceSchema.safeParse({
      ...validInvoice,
      items: [{ quantity: 1, unit_price: 75 }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      message: "Please select a product",
      path: ["items", 0, "product_id"],
    });
  });

  it("keeps a null manual total, and refuses a negative one", () => {
    expect(
      CreateInvoiceSchema.safeParse({ ...validInvoice, total_override: null })
        .data?.total_override,
    ).toBeNull();
    expect(
      CreateInvoiceSchema.safeParse({ ...validInvoice, total_override: -1 })
        .success,
    ).toBe(false);
  });
});

describe("customer contact details", () => {
  it("accepts optional phone and address fields, trimmed", () => {
    const result = CreateCustomerSchema.safeParse({
      ...validCustomer,
      phone: " 403-555-0100 ",
      address_line1: "1 Main St",
      city: "Calgary",
      region: "AB",
      postal_code: "T2P 1J9",
      country: "Canada",
      address_line2: null,
    });
    expect(result.data).toMatchObject({
      phone: "403-555-0100",
      address_line2: null,
    });
  });

  it("limits their length", () => {
    expect(
      CreateCustomerSchema.safeParse({
        ...validCustomer,
        postal_code: "x".repeat(21),
      }).error?.issues[0].message,
    ).toBe("Must be at most 20 characters");
  });
});
