import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import type {
  CreateCustomerInput,
  Customer,
  PaginatedValue,
} from "@/dal/types";

export async function fetchingCustomersDb(
  orgId: string,
  page: number = 1,
  all: boolean = false
): Promise<PaginatedValue<Customer>> {
  "use cache";
  const tag = all ? `customers-${orgId}-all` : `customers-${orgId}-page-${page}`;
  cacheTag(`customers-${orgId}`, tag);

  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);

  if (all) {
    const data = await sql`
      SELECT * FROM customers 
      WHERE deleted = false AND org_id = ${orgId}
      ORDER BY id DESC
    ` as Customer[];

    return {
      data,
      currentPage: 1,
      totalPages: 1,
      totalCount: data.length,
    };
  }

  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const [data, countResult] = await Promise.all([
    sql`
      SELECT * FROM customers 
      WHERE deleted = false AND org_id = ${orgId}
      ORDER BY id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) as total FROM customers 
      WHERE deleted = false AND org_id = ${orgId}
    `,
  ]);

  const totalCount = Number(countResult[0].total);
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: data as Customer[],
    currentPage: page,
    totalPages: totalPages,
    totalCount: totalCount,
  };
}
// export async function fetchingCustomersDb(
//   orgId: string,
//   page: number = 1,
// ): Promise<PaginatedCustomers> {
//   // Simulate network delay
//   await new Promise((resolve) => setTimeout(resolve, 500));

//   const totalCount = 55;
//   const pageSize = 10;
//   const totalPages = Math.ceil(totalCount / pageSize);

//   // Generate 55 mock people
//   const allMockPeople: Customer[] = Array.from({ length: totalCount }, (_, i) => ({
//     id: crypto.randomUUID(),
//     name: `Mock User ${i + 1}`,
//     email: `user${i + 1}@example.com`,
//     org_id: orgId,
//   }));

//   // Slice the data to return only the current page requested
//   const start = (page - 1) * pageSize;
//   const end = start + pageSize;
//   const pagedData = allMockPeople.slice(start, end);

//   return {
//     customers: pagedData,
//     currentPage: page,
//     totalPages: totalPages,
//     totalCount: totalCount,
//   };
// }

export async function createCustomerDb(
  input: CreateCustomerInput,
  orgId: string,
): Promise<Customer> {
  const sql = neon(String(process.env.DATABASE_URL));
  const [newCustomer] = (await sql`
    INSERT INTO customers (name, email, org_id)
    VALUES (${input.name}, ${input.email}, ${orgId})
    RETURNING *
  `) as Customer[];
  return newCustomer;
}

export async function deleteCustomerDb(
  id: string,
  orgId: string,
): Promise<Customer> {
  const sql = neon(String(process.env.DATABASE_URL));
  const [result] = await sql`
    UPDATE customers 
    SET deleted = true 
    WHERE id = ${id} AND org_id = ${orgId}
    RETURNING *
  `;
  if (!result) {
    throw new Error(`Customer not found or not authorized`);
  }
  return result as Customer;
}
