import { neon } from "@neondatabase/serverless";
import type { CreateCustomerInput, Customer } from "@/dal/types";

export async function fetchingCustomersDb(orgId: string): Promise<Customer[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const data = (await sql`
    SELECT * FROM customers 
    WHERE deleted = false AND org_id = ${orgId}
  `) as Customer[];
  return data;
}

export async function createCustomerDb(
  input: CreateCustomerInput,
  orgId: string,
): Promise<Customer> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const [newCustomer] = (await sql`
    INSERT INTO customers (name, email, org_id)
    VALUES (${input.name}, ${input.email}, ${orgId})
    RETURNING *
  `) as Customer[];
  return newCustomer;
}

export async function deleteCustomerDb(id: string): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    UPDATE customers 
    SET deleted = true 
    WHERE id = ${id}
  `;
}
