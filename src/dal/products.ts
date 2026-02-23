import { neon } from "@neondatabase/serverless";
import type { CreateProductInput, Product, Result } from "./types";

const ORG_ID = "org001a";
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

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newProduct: Product = {
    ...input,
    id: Math.random().toString(36).substring(7),
    org_id: ORG_ID,
  };
  products.push(newProduct);
  return newProduct;
}
