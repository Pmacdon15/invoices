import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import type { CreateProductInput, Product } from "@/dal/types";

export async function fetchingProductsDb(orgId: string): Promise<Product[]> {
  "use cache";
  cacheTag(`products-${orgId}`);
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const productsFromDb = (await sql`
    SELECT * FROM products 
    WHERE deleted = false AND org_id = ${orgId}
  `) ;

  return productsFromDb.map((product) => ({
    ...product,
    price: parseFloat(product.price),
  })) as Product[];
}

export async function createProductDb(
  input: CreateProductInput,
  orgId: string,
): Promise<Product> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const [newProduct] = (await sql`
    INSERT INTO products (name, price, org_id)
    VALUES (${input.name}, ${input.price}, ${orgId})
    RETURNING *
  `) as Product[];
  return newProduct;
}

export async function deleteProductDb(id: string): Promise<Product> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);

  // 1. Capture the result (neon returns an array)
  const result = await sql`
    UPDATE products 
    SET deleted = true 
    WHERE id = ${id}
    RETURNING *
  `;

  // 2. Return the first element (the updated row) or null if not found
  return (result[0] as Product);
}
