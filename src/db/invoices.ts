import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import type {
  CreateInvoiceInput,
  FullInvoice,
  Invoice,
  PaginatedValue,
  UpdateInvoiceInput,
} from "@/dal/types";

export async function fetchingInvoicesDb(
  orgId: string,
  page: number = 1,
  query?: string,
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

  const whereClause = query
    ? sql`WHERE i.org_id = ${orgId} AND (
        c.name ILIKE ${`%${query}%`} OR 
        c.email ILIKE ${`%${query}%`} OR 
        i.id::TEXT ILIKE ${`%${query}%`} OR 
        i.total::TEXT ILIKE ${`%${query}%`} OR 
        i.created_at::TEXT ILIKE ${`%${query}%`}
      )`
    : sql`WHERE i.org_id = ${orgId}`;

  const [data, countResult] = await Promise.all([
    sql`
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email
      FROM invoices i 
      JOIN customers c ON i.customer_id = c.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,

    sql`
      SELECT COUNT(*) as total FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      ${whereClause}
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

export async function searchInvoicesDb(
  orgId: string,
  query: string,
): Promise<Invoice[]> {
  "use cache";
  cacheTag(`invoices-${orgId}`);

  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);
  const data = (await sql`
    SELECT 
      i.*,
      c.name as customer_name,
      c.email as customer_email,
      c.status as customer_status
    FROM invoices i 
    JOIN customers c ON i.customer_id = c.id
    WHERE i.org_id = ${orgId} AND (
      c.name ILIKE ${`%${query}%`} OR 
      c.email ILIKE ${`%${query}%`} OR 
      i.id::TEXT ILIKE ${`%${query}%`} OR 
      i.total::TEXT ILIKE ${`%${query}%`} OR 
      i.created_at::TEXT ILIKE ${`%${query}%`}
    )
    ORDER BY i.created_at DESC
    LIMIT 10
  `) as (Invoice & {
    customer_name: string;
    customer_email: string;
    customer_status: "active" | "disabled" | "deleted";
  })[];

  return data.map((inv) => ({
    ...inv,
    customer: {
      id: inv.customer_id,
      name: inv.customer_name,
      email: inv.customer_email,
      org_id: inv.org_id,
      status: inv.customer_status,
    },
  })) as Invoice[];
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
      c.email as customer_email,
      c.status as customer_status
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ${id} AND i.org_id = ${orgId}
  `) as (Invoice & {
    customer_name: string;
    customer_email: string;
    customer_status: "active" | "disabled" | "deleted";
  })[];

  if (!invoice) return null;

  const items = (await sql`
    SELECT 
      ii.*,
      p.name as product_name,
      p.status as product_status
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = ${id}
  `) as {
    id: string;
    invoice_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    product_name: string;
    product_status: "active" | "disabled" | "deleted";
  }[];

  return {
    ...invoice,
    customer: {
      id: invoice.customer_id,
      name: invoice.customer_name,
      email: invoice.customer_email,
      org_id: invoice.org_id,
      status: invoice.customer_status,
    },
    items: items.map((item) => ({
      ...item,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        org_id: invoice.org_id,
        status: item.product_status,
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

  const productIds = input.items.map((i) => i.product_id);
  const uniqueProductIdsCount = new Set(productIds).size;

  const results = (await sql`
    WITH valid_customer AS (
      SELECT id FROM customers 
      WHERE id = ${customerId}::uuid 
      AND status = 'active' 
      AND org_id = ${orgId}
    ),
    valid_products AS (
      SELECT id FROM products 
      WHERE id = ANY(${productIds}::uuid[]) 
      AND status = 'active' 
      AND org_id = ${orgId}
    ),
    new_invoice AS (
      INSERT INTO invoices (customer_id, status, org_id, total)
      SELECT 
        valid_customer.id, 
        ${input.status}, 
        ${orgId}, 
        ${totalAmount}
      FROM valid_customer
      WHERE (SELECT COUNT(*) FROM valid_products) = ${uniqueProductIdsCount}
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
    SELECT 
      ni.*,
      (SELECT COUNT(*) FROM valid_customer) as customer_ok,
      (SELECT COUNT(*) FROM valid_products) as products_ok
    FROM (SELECT 1) d
    LEFT JOIN new_invoice ni ON true;
  `) as (Invoice & { customer_ok: string; products_ok: string })[];

  const result = results[0];

  if (!result.id) {
    if (Number(result?.customer_ok) === 0) {
      throw new Error("Customer not found or is disabled");
    }
    if (Number(result?.products_ok) !== uniqueProductIdsCount) {
      throw new Error("One or more products are not found or are disabled");
    }
    throw new Error("Failed to create invoice");
  }

  // Remove the extra properties before returning
  const { customer_ok, products_ok, ...invoice } = result;
  return invoice as Invoice;
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
export async function sendInvoiceDb(
  id: string,
  orgId: string,
  orgName: string,
): Promise<Invoice> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS SES credentials are not configured");
  }

  const sql = neon(process.env.DATABASE_URL);

  // Fetch the full invoice with customer + items
  const [invoice] = (await sql`
    SELECT 
      i.*,
      c.name as customer_name,
      c.email as customer_email
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ${id} AND i.org_id = ${orgId}
  `) as (Invoice & { customer_name: string; customer_email: string })[];

  if (!invoice) throw new Error("Invoice not found or not authorized");

  const items = (await sql`
    SELECT 
      ii.*,
      p.name as product_name
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = ${id}
  `) as { product_name: string; quantity: number; unit_price: number }[];

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${item.product_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt.format(item.unit_price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt.format(item.quantity * item.unit_price)}</td>
      </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#18181b;padding:24px 32px;border-radius:8px 8px 0 0">
        <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.05em">Invoice from</p>
        <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0">${orgName}</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px 32px">
        <p style="color:#6b7280;font-size:12px;margin:0 0 20px 0">Invoice ID: ${invoice.id}</p>
        <p style="margin:0 0 4px 0">Hi <strong>${invoice.customer_name}</strong>,</p>
        <p style="margin:0 0 24px 0;color:#374151">Please find your invoice details below. Payment is due upon receipt.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280">Description</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280">Qty</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280">Price</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr style="background:#f9fafb">
              <td colspan="3" style="padding:10px 12px;text-align:right;font-weight:700;text-transform:uppercase;font-size:13px">Total Due</td>
              <td style="padding:10px 12px;text-align:right;font-weight:700;font-size:18px;color:#18181b">${fmt.format(invoice.total as unknown as number)}</td>
            </tr>
          </tfoot>
        </table>
        <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:16px;margin:0">Thank you for your business — ${orgName}</p>
      </div>
    </div>
  `;

  const fromEmail = process.env.SES_FROM_EMAIL ?? "invoices@yourdomain.com";

  const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
  const ses = new SESClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  await ses.send(
    new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [invoice.customer_email] },
      Message: {
        Subject: {
          Data: `Invoice from ${orgName} \u2013 ${fmt.format(invoice.total as unknown as number)}`,
          Charset: "UTF-8",
        },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
        },
      },
    }),
  );

  // Update status to 'sent'
  const result = await sql`
    UPDATE invoices
    SET status = 'sent'
    WHERE id = ${id} AND org_id = ${orgId}
    RETURNING *;
  `;

  return result[0] as Invoice;
}

export async function getMonthlyInvoiceCount(orgId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sql = neon(String(process.env.DATABASE_URL));
  // Example using a standard Postgres client or Drizzle
  const result = await sql`
    SELECT count(*) as count 
    FROM invoices 
    WHERE org_id = ${orgId} 
    AND created_at >= ${startOfMonth.toISOString()}
  `;

  return Number(result[0]?.count ?? 0);
}

export async function updateInvoiceDb(
  input: UpdateInvoiceInput,
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
    WITH deleted_items AS (
      DELETE FROM invoice_items
      WHERE invoice_id = ${input.id} AND invoice_id IN (SELECT id FROM invoices WHERE org_id = ${orgId})
    ),
    updated_invoice AS (
      UPDATE invoices
      SET customer_id = ${customerId}::uuid,
          status = ${input.status},
          total = ${totalAmount}
      WHERE id = ${input.id} AND org_id = ${orgId}
      RETURNING id, customer_id, total, status, org_id, created_at
    ),
    inserted_items AS (
      INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price)
      SELECT 
        ${input.id}, 
        items.product_id, 
        items.quantity, 
        items.unit_price
      FROM UNNEST(
        ${input.items.map((i) => i.product_id)}::uuid[],
        ${input.items.map((i) => i.quantity)}::int[],
        ${input.items.map((i) => i.unit_price)}::numeric[]
      ) AS items(product_id, quantity, unit_price)
      WHERE EXISTS (SELECT 1 FROM updated_invoice)
    )
    SELECT * FROM updated_invoice;
  `) as Invoice[];

  if (!data) {
    throw new Error("Invoice not found or not authorized");
  }

  return data;
}
