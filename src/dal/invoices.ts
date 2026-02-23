import { neon } from "@neondatabase/serverless";
import type { CreateInvoiceInput, Invoice } from "./types";

const ORG_ID = "org001a";

export async function getInvoices(): Promise<
  [data: Invoice[] | null, error: string | null]
> {
  if (!process.env.DATABASE_URL) {
    return [null, "Configuration error"];
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const data = (await sql`SELECT * FROM invoices`) as Invoice[];

    return [data, null];
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return [null, "Database error occurred while fetching invoices."];
  }
}

// export async function getInvoices(): Promise<Invoice[]> {
//   await new Promise((resolve) => setTimeout(resolve, 500));
//   return invoices.filter((i) => i.org_id === ORG_ID);
// }

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
