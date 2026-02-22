import type { CreateInvoiceInput, Invoice } from "./types";

const ORG_ID = "org001a";

// Mock database
const invoices: Invoice[] = [
  {
    id: "inv1",
    customer_id: "1",
    total: 150,
    status: "draft",
    org_id: ORG_ID,
    created_at: new Date().toISOString(),
    items: [
      {
        id: "item1",
        invoice_id: "inv1",
        product_id: "p1",
        quantity: 1,
        unit_price: 100,
      },
      {
        id: "item2",
        invoice_id: "inv1",
        product_id: "p2",
        quantity: 1,
        unit_price: 50,
      },
    ],
  },
];

export async function getInvoices(): Promise<Invoice[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return invoices.filter((i) => i.org_id === ORG_ID);
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<Invoice> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const total = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  const newInvoice: Invoice = {
    ...input,
    id: Math.random().toString(36).substring(7),
    total,
    org_id: ORG_ID,
    created_at: new Date().toISOString(),
    items: input.items.map((item) => ({
      ...item,
      id: Math.random().toString(36).substring(7),
      invoice_id: "temp", // Updated below
    })),
  };

  newInvoice.items?.forEach((item) => {
    item.invoice_id = newInvoice.id;
  });

  invoices.push(newInvoice);
  return newInvoice;
}
