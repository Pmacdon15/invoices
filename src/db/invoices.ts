import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import type {
  CreateInvoiceInput,
  FullInvoice,
  Invoice,
  PaginatedValue,
} from "@/dal/types";

// export async function fetchingInvoicesDb(orgId: string, page:number): Promise<Invoice[]> {
//   "use cache";
//   cacheTag(`invoices-${orgId}`);
//   if (!process.env.DATABASE_URL) {
//     throw new Error("Config Error");
//   }
//   const sql = neon(process.env.DATABASE_URL);
//   const data = (await sql`
//     SELECT
//       i.*,
//       c.name as customer_name,
//       c.email as customer_email
//     FROM invoices i
//     JOIN customers c ON i.customer_id = c.id
//     WHERE i.org_id = ${orgId}
//     ORDER BY i.created_at DESC
//   `) as (Invoice & { customer_name: string; customer_email: string })[];

//   return data.map((inv) => ({
//     ...inv,
//     customer: {
//       id: inv.customer_id,
//       name: inv.customer_name,
//       email: inv.customer_email,
//       org_id: inv.org_id,
//     },
//   }));
// }
export async function fetchingInvoicesDb(
  orgId: string,
  page: number = 1,
): Promise<PaginatedValue<Invoice>> {
  "use cache";
  // Including the page in the tag ensures specific pages can be purged or cached independently
  cacheTag(`invoices-${orgId}`, `invoices-${orgId}-page-${page}`);

  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const [data, countResult] = await Promise.all([
    sql`
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email
      FROM invoices i 
      JOIN customers c ON i.customer_id = c.id
      WHERE i.org_id = ${orgId}
      ORDER BY i.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,

    sql`
      SELECT COUNT(*) as total FROM invoices 
      WHERE org_id = ${orgId}
    `,
  ]);

  const totalCount = Number(countResult[0].total);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Map the flat SQL result into the nested Invoice object structure
  const formattedData = data.map((inv) => ({
    ...inv,
    customer: {
      id: inv.customer_id,
      name: inv.customer_name,
      email: inv.customer_email,
      org_id: inv.org_id,
    },
  })) as Invoice[];

  return {
    data: formattedData,
    currentPage: page,
    totalPages: totalPages,
    totalCount: totalCount,
  };
}

export async function fetchingInvoiceByIdDb(
  id: string,
  orgId: string,
): Promise<FullInvoice | null> {
  "use cache";
  cacheTag(`invoice-${id}`);
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);

  const [invoice] = (await sql`
    SELECT 
      i.*,
      c.name as customer_name,
      c.email as customer_email
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ${id} AND i.org_id = ${orgId}
  `) as (Invoice & { customer_name: string; customer_email: string })[];

  if (!invoice) return null;

  const items = (await sql`
    SELECT 
      ii.*,
      p.name as product_name
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = ${id}
  `) as any[];

  return {
    ...invoice,
    customer: {
      id: invoice.customer_id,
      name: invoice.customer_name,
      email: invoice.customer_email,
      org_id: invoice.org_id,
    },
    items: items.map((item) => ({
      ...item,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        org_id: invoice.org_id,
      },
    })),
  };
}

export async function createInvoiceDb(
  input: CreateInvoiceInput,
  orgId: string,
): Promise<Invoice> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const customerId = input.customer_id;

  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  const [data] = (await sql`
    WITH new_invoice AS (
      INSERT INTO invoices (customer_id, status, org_id, total)
      VALUES (
        ${customerId}::uuid, 
        ${input.status}, 
        ${orgId}, 
        ${totalAmount}
      )
      RETURNING id, customer_id, total, status, org_id, created_at
    ),
    inserted_items AS (
      INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price)
      SELECT 
        new_invoice.id, 
        items.product_id, 
        items.quantity, 
        items.unit_price
      FROM new_invoice
      CROSS JOIN UNNEST(
        ${input.items.map((i) => i.product_id)}::uuid[],
        ${input.items.map((i) => i.quantity)}::int[],
        ${input.items.map((i) => i.unit_price)}::numeric[]
      ) AS items(product_id, quantity, unit_price)
    )
    SELECT * FROM new_invoice;
  `) as Invoice[];

  return data;
}

export async function deleteInvoiceDb(
  id: string,
  orgId: string,
): Promise<Invoice> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);

  await sql`
    DELETE FROM invoice_items 
    WHERE invoice_id = ${id} 
    AND invoice_id IN (SELECT id FROM invoices WHERE org_id = ${orgId})
  `;

  const result = await sql`
    DELETE FROM invoices 
    WHERE id = ${id} AND org_id = ${orgId}
    RETURNING *
  `;
  if (!result[0]) {
    throw new Error(`Invoice not found or not authorized`);
  }

  return result[0] as Invoice;
}
export async function updateInvoiceStatusDb(
  id: string,
  status: "draft" | "sent" | "paid",
  orgId: string,
): Promise<Invoice> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`
    UPDATE invoices 
    SET status = ${status}
    WHERE id = ${id} AND org_id = ${orgId}
    RETURNING *;
  `;
  return result[0] as Invoice;
}
