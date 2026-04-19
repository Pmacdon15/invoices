import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import type { CreateProductInput, PaginatedValue, Product } from "@/dal/types";
export async function fetchingProductsDb(
  orgId: string,
  page: number = 1,
  all: boolean = false,
  query?: string,
): Promise<PaginatedValue<Product>> {
  "use cache";
  const tag = all ? `products-${orgId}-all` : `products-${orgId}-page-${page}`;
  cacheTag(`products-${orgId}`, tag);

  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);

  if (all) {
    const data = (await sql`
      SELECT * FROM products 
      WHERE status != 'deleted' AND org_id = ${orgId}
      ORDER BY id DESC
    `) as Product[];

    return {
      data,
      currentPage: 1,
      totalPages: 1,
      totalCount: data.length,
    };
  }

  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const whereClause = query
    ? sql`WHERE status != 'deleted' AND org_id = ${orgId} AND name ILIKE ${`%${query}%`}`
    : sql`WHERE status != 'deleted' AND org_id = ${orgId}`;

  const [rows, countResult] = await Promise.all([
    sql`
      SELECT * FROM products 
      ${whereClause}
      ORDER BY id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) as total FROM products 
      ${whereClause}
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

export async function searchProductsDb(
  orgId: string,
  query: string,
): Promise<Product[]> {
  "use cache";
  cacheTag(`products-${orgId}`);

  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);
  const data = (await sql`
    SELECT * FROM products 
    WHERE status != 'deleted' AND org_id = ${orgId} AND name ILIKE ${`%${query}%`}
    ORDER BY name ASC
    LIMIT 10
  `) as Product[];

  return data;
}

export async function getProductCount(orgId: string): Promise<number> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`
    SELECT count(*) as count 
    FROM products 
    WHERE org_id = ${orgId} 
    AND status = 'active'
  `;

  return Number(result[0]?.count ?? 0);
}
