import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import type { CreateProductInput, PaginatedValue, Product } from "@/dal/types";
export async function fetchingProductsDb(
  orgId: string,
  page: number = 1,
  all: boolean = false
): Promise<PaginatedValue<Product>> {
  "use cache";
  const tag = all ? `products-${orgId}-all` : `products-${orgId}-page-${page}`;
  cacheTag(`products-${orgId}`, tag);

  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);

  if (all) {
    const data = await sql`
      SELECT * FROM products 
      WHERE deleted = false AND org_id = ${orgId}
      ORDER BY id DESC
    ` as Product[];

    return {
      data,
      currentPage: 1,
      totalPages: 1,
      totalCount: data.length,
    };
  }

  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const [rows, countResult] = await Promise.all([
    sql`
      SELECT * FROM products 
      WHERE deleted = false AND org_id = ${orgId}
      ORDER BY id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) as total FROM products 
      WHERE deleted = false AND org_id = ${orgId}
    `,
  ]);

  const totalCount = Number(countResult[0].total);
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: rows as Product[],
    currentPage: page,
    totalPages: totalPages,
    totalCount: totalCount,
  };
}

export async function createProductDb(
  input: CreateProductInput,
  orgId: string,
): Promise<Product> {
  const sql = neon(String(process.env.DATABASE_URL));
  const [newProduct] = (await sql`
    INSERT INTO products (name, price, org_id)
    VALUES (${input.name}, ${input.price}, ${orgId})
    RETURNING *
  `) as Product[];
  return newProduct;
}

export async function deleteProductDb(
  id: string,
  orgId: string,
): Promise<Product> {
  const sql = neon(String(process.env.DATABASE_URL));

  const [result] = await sql`
    UPDATE products 
    SET deleted = true 
    WHERE id = ${id} AND org_id = ${orgId}
    RETURNING *
  `;

  if (!result) {
    throw new Error(`Product id not found or not authorized`);
  }

  return result as Product;
}
