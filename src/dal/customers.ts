import { neon } from "@neondatabase/serverless";
import { CreateCustomerSchema } from "./schema";
import type { CreateCustomerInput, Customer, Result } from "./types";

export async function getCustomers(): Promise<Result<Customer[]>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const data = (await sql`SELECT * FROM customers`) as Customer[];

    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return {
      data: null,
      error: "Database error occurred while fetching customers.",
    };
  }
}

export async function createCustomerDal(
  input: CreateCustomerInput,
): Promise<Result<Customer>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  const validation = CreateCustomerSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.issues[0].message };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const [newCustomer] = (await sql`
      INSERT INTO customers (name, email, org_id)
      VALUES (${input.name}, ${input.email}, ${"org001a"})
      RETURNING *
    `) as Customer[];

    return { data: newCustomer, error: null };
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return {
      data: null,
      error: "Failed to create customer. Please try again.",
    };
  }
}

export async function deleteCustomerDal(id: string): Promise<Result<void>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    await sql`DELETE FROM customers WHERE id = ${id}`;

    return { data: undefined, error: null };
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return { data: null, error: "Failed to delete customer." };
  }
}
