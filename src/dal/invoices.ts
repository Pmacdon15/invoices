import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import { CreateInvoiceSchema } from "./schema";
import type { CreateInvoiceInput, Invoice, Result } from "./types";

export async function getInvoices(): Promise<Result<Invoice[]>> {
  "use cache: private";
  cacheTag("invoices");
  const { orgId } = await auth.protect();
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const data = (await sql`
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email
      FROM invoices i 
      JOIN customers c ON i.customer_id = c.id
      WHERE i.org_id = ${orgId}
      ORDER BY i.created_at DESC
    `) as (Invoice & { customer_name: string; customer_email: string })[];

    const formattedData = data.map((inv) => ({
      ...inv,
      customer: {
        id: inv.customer_id,
        name: inv.customer_name,
        email: inv.customer_email,
        org_id: inv.org_id,
      },
    }));

    return { data: formattedData, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Database error occurred." };
  }
}

export async function getInvoiceById(id: string): Promise<Result<Invoice>> {
  const { orgId } = await auth.protect();
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const [invoice] = (await sql`
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ${id} AND i.org_id = ${orgId}
    `) as (Invoice & { customer_name: string; customer_email: string })[];

    if (!invoice) return { data: null, error: "Invoice not found" };

    const items = (await sql`
      SELECT 
        ii.*,
        p.name as product_name
      FROM invoice_items ii
      JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ${id}
    `) as any[];

    return {
      data: {
        ...invoice,
        customer: {
          id: invoice.customer_id,
          name: invoice.customer_name,
          email: invoice.customer_email,
          org_id: invoice.org_id,
        },
        items: items.map((item) => ({
          ...item,
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            org_id: invoice.org_id,
          },
        })),
      },
      error: null,
    };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Failed to fetch invoice." };
  }
}

export async function createInvoiceDal(
  input: CreateInvoiceInput,
): Promise<Result<Invoice>> {
  const { orgId } = await auth.protect();
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  const validation = CreateInvoiceSchema.safeParse(input);
  console.log("validation: ", validation);
  if (!validation.success) {
    return { data: null, error: validation.error.issues[0].message };
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const customerId = input.customer_id;

    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );

    const [data] = (await sql`
      WITH new_invoice AS (
        INSERT INTO invoices (customer_id, status, org_id, total)
        VALUES (
          ${customerId}::uuid, 
          ${input.status}, 
          ${orgId}, 
          ${totalAmount}
        )
        RETURNING id, customer_id, total, status, org_id, created_at
      ),
      inserted_items AS (
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price)
        SELECT 
          new_invoice.id, 
          items.product_id, 
          items.quantity, 
          items.unit_price
        FROM new_invoice
        CROSS JOIN UNNEST(
          ${input.items.map((i) => i.product_id)}::uuid[],
          ${input.items.map((i) => i.quantity)}::int[],
          ${input.items.map((i) => i.unit_price)}::numeric[]
        ) AS items(product_id, quantity, unit_price)
      )
      SELECT * FROM new_invoice;
    `) as Invoice[];

    return { data, error: null };
  } catch (e: unknown) {
    console.error("SQL Error:", e);
    return { data: null, error: "Database failed to create invoice." };
  }
}

export async function deleteInvoiceDal(id: string): Promise<Result<void>> {
  await auth.protect();
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Delete invoice items first (assuming no CASCADE)
    await sql`DELETE FROM invoice_items WHERE invoice_id = ${id}`;
    await sql`DELETE FROM invoices WHERE id = ${id}`;

    return { data: undefined, error: null };
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return { data: null, error: "Failed to delete invoice." };
  }
}
