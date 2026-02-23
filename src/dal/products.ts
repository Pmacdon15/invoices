import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import { CreateProductSchema } from "./schema";
import type { CreateProductInput, Product, Result } from "./types";

export async function getProducts(): Promise<Result<Product[]>> {
  "use cache: private";
  cacheTag("products");
  const { orgId } = await auth.protect();

  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const productsFromDb =
      (await sql`SELECT * FROM products WHERE deleted = false AND org_id = ${orgId}`) as any[];
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
  const { orgId } = await auth.protect();
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
      VALUES (${input.name}, ${input.price}, ${orgId})
      RETURNING *
    `) as Product[];

    return { data: newProduct, error: null };
  } catch (e: unknown) {
    console.error("Database Insert Error:", e);
    return { data: null, error: "Failed to create product. Please try again." };
  }
}

export async function deleteProductDal(id: string): Promise<Result<void>> {
  await auth.protect();
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    await sql`UPDATE products 
      SET deleted = true 
      WHERE id = ${id}`;

    return { data: undefined, error: null };
  } catch (e: unknown) {
    console.error("Database Delete Error:", e);
    return { data: null, error: "Failed to delete product." };
  }
}
