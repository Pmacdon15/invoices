import { neon } from "@neondatabase/serverless";
import type { CreateInvoiceInput, Invoice, Result } from "./types";

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
export async function createInvoiceDal(
  input: CreateInvoiceInput,
): Promise<Result<Invoice>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. Calculate the total from the form items
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );

    // 2. Run the single-statement CTE
    const [data] = (await sql`
      WITH new_invoice AS (
        INSERT INTO invoices (customer_id, status, org_id, total)
        VALUES (
          ${input.customer_id}::uuid, 
          ${input.status}, 
          ${"org001a"}, 
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
    
    // Check if the error is specifically about the UUID format
    const errorMessage = e instanceof Error && e.message.includes("invalid input syntax for type uuid")
      ? "Please select a valid customer."
      : "Database failed to create invoice.";

    return { data: null, error: errorMessage };
  }
}