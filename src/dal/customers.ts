import { neon } from "@neondatabase/serverless";
import type { CreateCustomerInput, Customer } from "./types";

export async function getCustomers(): Promise<
  [data: Customer[] | null, error: string | null]
> {
  if (!process.env.DATABASE_URL) {
    return [null, "Configuration error"];
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const data = (await sql`SELECT * FROM customers`) as Customer[];

    return [data, null];
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return [null, "Database error occurred while fetching customers."];
  }
}

export async function createCustomerDal(
  input: CreateCustomerInput,
): Promise<[data: Customer | null, error: string | null]> {
  
  if (!process.env.DATABASE_URL) {
    return [null, "Configuration error"];
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL);

    const [newCustomer] = (await sql`
      INSERT INTO customers (name, email, org_id)
      VALUES (${input.name}, ${input.email}, ${"org001a"})
      RETURNING *
    `) as Customer[];

    return [newCustomer, null];
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return [null, "Failed to create customer. Please try again."];
  }
}
