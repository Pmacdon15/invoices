import { neon } from "@neondatabase/serverless";
import type { CreateProductInput, Product, Result } from "./types";

export async function getProducts(): Promise<Result<Product[]>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const data = (await sql`SELECT * FROM products`) as Product[];

    return { data, error: null };

  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
   return { data: null, error: "Database error occurred." };
  }
}


export async function createProductDal(
  input: CreateProductInput,
): Promise<[data: Product | null, error: string | null]> {
  if (!process.env.DATABASE_URL) {
    return [null, "Configuration error"];
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const [newCustomer] = (await sql`
      INSERT INTO products (name, price, org_id)
      VALUES (${input.name}, ${input.price}, ${"org001a"})
      RETURNING *
    `) as Product[]

    return [newCustomer, null];
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return [null, "Failed to create product. Please try again."];
  }
}
