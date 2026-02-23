import { neon } from "@neondatabase/serverless";
import { CreateProductSchema } from "./schema";
import type { CreateProductInput, Product, Result } from "./types";

export async function getProducts(): Promise<Result<Product[]>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const productsFromDb = (await sql`SELECT * FROM products`) as any[];
    const data = productsFromDb.map((product) => ({
      ...product,
      price: parseFloat(product.price),
    })) as Product[];

    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Database error occurred." };
  }
}

export async function createProductDal(
  input: CreateProductInput,
): Promise<Result<Product>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  const validation = CreateProductSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.message };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const [newProduct] = (await sql`
      INSERT INTO products (name, price, org_id)
      VALUES (${input.name}, ${input.price}, ${"org001a"})
      RETURNING *
    `) as Product[];

    return { data: newProduct, error: null };
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return { data: null, error: "Failed to create product. Please try again." };
  }
}

export async function deleteProductDal(id: string): Promise<Result<void>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    await sql`DELETE FROM products WHERE id = ${id}`;

    return { data: undefined, error: null };
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return { data: null, error: "Failed to delete product." };
  }
}
