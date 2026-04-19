import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import { jsPDF } from "jspdf";
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

async function generateInvoicePdf(
  invoice: Invoice & { customer_name: string; customer_email: string },
  items: { product_name: string; quantity: number; unit_price: number }[],
  orgName: string,
  orgImageUrl?: string,
): Promise<Buffer> {
  const doc = new jsPDF();
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  let yOffset = 20;

  // Add Logo if exists
  if (orgImageUrl) {
    try {
      const response = await fetch(orgImageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      // We assume it's a common image format. jsPDF handles most if given as bytes.
      doc.addImage(uint8Array, "PNG", 20, yOffset, 30, 30);
      yOffset += 40;
    } catch (e) {
      console.error("Failed to add logo to PDF:", e);
      yOffset += 10;
    }
  }

  // Header
  doc.setFontSize(24);
  doc.text("INVOICE", 105, yOffset, { align: "center" });
  yOffset += 20;

  doc.setFontSize(10);
  doc.text(`From: ${orgName}`, 20, yOffset);
  yOffset += 5;
  doc.text(`Invoice ID: ${invoice.id}`, 20, yOffset);
  yOffset += 5;
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, yOffset);
  yOffset += 20;

  // Billed To
  doc.setFontSize(12);
  doc.text("BILLED TO:", 20, yOffset);
  yOffset += 5;
  doc.setFontSize(10);
  doc.text(invoice.customer_name, 20, yOffset);
  yOffset += 5;
  doc.text(invoice.customer_email, 20, yOffset);
  yOffset += 20;

  // Items Table Header
  doc.setFontSize(10);
  doc.text("Description", 20, yOffset);
  doc.text("Qty", 120, yOffset, { align: "center" });
  doc.text("Price", 150, yOffset, { align: "right" });
  doc.text("Amount", 190, yOffset, { align: "right" });
  doc.line(20, yOffset + 2, 190, yOffset + 2);
  yOffset += 10;

  // Items
  for (const item of items) {
    if (yOffset > 270) {
      doc.addPage();
      yOffset = 20;
    }
    doc.text(item.product_name, 20, yOffset);
    doc.text(item.quantity.toString(), 120, yOffset, { align: "center" });
    doc.text(fmt.format(item.unit_price), 150, yOffset, { align: "right" });
    doc.text(fmt.format(item.quantity * item.unit_price), 190, yOffset, { align: "right" });
    yOffset += 10;
  }

  // Footer Total
  doc.line(20, yOffset, 190, yOffset);
  yOffset += 10;
  doc.setFontSize(12);
  doc.text("TOTAL DUE:", 150, yOffset, { align: "right" });
  doc.text(fmt.format(Number(invoice.total)), 190, yOffset, { align: "right" });

  return Buffer.from(doc.output("arraybuffer"));
}

export async function sendInvoiceDb(
  id: string,
  orgId: string,
  orgName: string,
  orgImageUrl?: string,
  adminEmail?: string,
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
        <td style="padding:12px;border-bottom:1px solid #f3f4f6;color:#374151;">${item.product_name}</td>
        <td style="padding:12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${item.quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${fmt.format(item.unit_price)}</td>
        <td style="padding:12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${fmt.format(item.quantity * item.unit_price)}</td>
      </tr>`,
    )
    .join("");

  const logoHtml = orgImageUrl 
    ? `<img src="${orgImageUrl}" alt="${orgName}" width="48" height="48" style="height:48px;width:48px;border-radius:6px;display:block;margin-bottom:16px;object-fit:cover;background-color:#ffffff !important;color-scheme:only light;" class="logo-img">`
    : "";

  const adminEmailHtml = adminEmail 
    ? `<p style="color:#6b7280;font-size:14px;margin-top:16px;" class="text-muted">This invoice was sent by your organization administrator: <strong>${adminEmail}</strong></p>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root {
      color-scheme: light only;
      supported-color-schemes: light only;
    }
    
    /* Force light mode background and text colors */
    body, .body-wrapper, .invoice-card {
      background-color: #ffffff !important;
      background-image: linear-gradient(#ffffff, #ffffff) !important;
      color: #111827 !important;
    }

    /* Prevent Gmail from inverting colors */
    u + .body-wrapper {
      background-color: #ffffff !important;
      color: #111827 !important;
    }

    /* Target Outlook.com dark mode */
    [data-ogsc] body, [data-ogsc] .body-wrapper, [data-ogsc] .invoice-card {
      background-color: #ffffff !important;
      background-image: linear-gradient(#ffffff, #ffffff) !important;
      color: #111827 !important;
    }

    /* Aggressive logo fix */
    .logo-img {
      background-color: #ffffff !important;
      color-scheme: only light !important;
    }
    
    @media (prefers-color-scheme: dark) {
      body, .body-wrapper, .invoice-card {
        background-color: #ffffff !important;
        background-image: linear-gradient(#ffffff, #ffffff) !important;
        color: #111827 !important;
      }
      .logo-img {
        background-color: #ffffff !important;
        color-scheme: only light !important;
      }
      .text-muted { color: #6b7280 !important; }
      .text-main { color: #111827 !important; }
      .border-light { border-color: #f3f4f6 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:40px 0;word-spacing:normal;background-color:#ffffff;" class="body-wrapper">
  <div role="article" aria-roledescription="email" lang="en" style="text-size-adjust:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px 0 rgba(0,0,0,0.1);" class="invoice-card">
      <div style="padding:40px;border-bottom:1px solid #f3f4f6" class="border-light">
        ${logoHtml}
        <p style="color:#6b7280;font-size:12px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;" class="text-muted">Invoice from</p>
        <h1 style="color:#111827;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.02em" class="text-main">${orgName}</h1>
      </div>
      <div style="padding:40px">
        <p style="color:#6b7280;font-size:13px;margin:0 0 32px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;" class="text-muted">ID: ${invoice.id}</p>
        <p style="margin:0 0 8px 0;font-size:18px;color:#111827" class="text-main">Hi <strong>${invoice.customer_name}</strong>,</p>
        <p style="margin:0 0 40px 0;color:#4b5563;line-height:1.6;font-size:16px;">Please find your invoice details below and attached as a PDF. Payment is due upon receipt. Thank you for choosing <strong>${orgName}</strong>.</p>
        
        ${adminEmailHtml}

        <table style="width:100%;border-collapse:collapse;margin:32px 0 40px 0">
          <thead>
            <tr>
              <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:#9ca3af;border-bottom:2px solid #f3f4f6;font-weight:700;letter-spacing:0.05em" class="border-light">Description</th>
              <th style="padding:12px;text-align:center;font-size:12px;text-transform:uppercase;color:#9ca3af;border-bottom:2px solid #f3f4f6;font-weight:700;letter-spacing:0.05em" class="border-light">Qty</th>
              <th style="padding:12px;text-align:right;font-size:12px;text-transform:uppercase;color:#9ca3af;border-bottom:2px solid #f3f4f6;font-weight:700;letter-spacing:0.05em" class="border-light">Price</th>
              <th style="padding:12px;text-align:right;font-size:12px;text-transform:uppercase;color:#9ca3af;border-bottom:2px solid #f3f4f6;font-weight:700;letter-spacing:0.05em" class="border-light">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:32px 12px 0 12px;text-align:right;font-weight:700;text-transform:uppercase;font-size:13px;color:#6b7280;letter-spacing:0.05em" class="text-muted">Total Due</td>
              <td style="padding:32px 12px 0 12px;text-align:right;font-weight:900;font-size:24px;color:#111827" class="text-main">${fmt.format(invoice.total as unknown as number)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="border-top:1px solid #f3f4f6;padding-top:32px;margin-top:32px" class="border-light">
           <p style="color:#9ca3af;font-size:14px;margin:0;line-height:1.6">If you have any questions or require further assistance, please don't hesitate to reach out to our support team at <a href="mailto:${invoice.customer_email}" style="color:#111827;text-decoration:none;font-weight:600;border-bottom:1px solid #e5e7eb;" class="text-main">${invoice.customer_email}</a>.</p>
           <p style="color:#111827;font-size:14px;margin:16px 0 0 0;font-weight:700;" class="text-main">Best regards,<br>${orgName}</p>
        </div>
      </div>
    </div>
    <div style="text-align:center;padding:32px 0;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Sent securely via InvoicePro.</p>
    </div>
  </div>
</body>
</html>
  `;

  const pdfBuffer = await generateInvoicePdf(invoice, items, orgName, orgImageUrl);
  const pdfBase64 = pdfBuffer.toString("base64");

  const fromEmail = process.env.SES_FROM_EMAIL ?? "invoices@yourdomain.com";
  const subject = `Invoice from ${orgName} \u2013 ${fmt.format(invoice.total as unknown as number)}`;
  const boundary = `NextPart_${Date.now().toString(16)}`;

  const rawMessage = [
    `From: ${orgName} <${fromEmail}>`,
    `To: ${invoice.customer_email}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
    `--${boundary}`,
    'Content-Type: application/pdf; name="invoice.pdf"',
    'Content-Description: invoice.pdf',
    'Content-Disposition: attachment; filename="invoice.pdf"; size=' + pdfBuffer.length,
    "Content-Transfer-Encoding: base64",
    "",
    pdfBase64.match(/.{1,76}/g)?.join("\n"),
    "",
    `--${boundary}--`
  ].join("\n");

  const { SESClient, SendRawEmailCommand } = await import("@aws-sdk/client-ses");
  const ses = new SESClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  await ses.send(
    new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawMessage) },
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
