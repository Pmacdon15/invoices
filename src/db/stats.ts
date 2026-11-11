import { neon } from "@neondatabase/serverless";
import { cacheLife, cacheTag } from "next/cache";

export async function getStatsDb(orgId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`stats-${orgId}`);
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);

  const data = await sql`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        '1 month'
      ) AS month
    )
    SELECT 
      to_char(months.month, 'Mon') AS name,
      COALESCE(SUM(CASE WHEN i.status != 'draft' THEN i.total ELSE 0 END), 0) AS revenue,
      COUNT(i.id) AS invoices,
      COUNT(CASE WHEN i.status = 'draft' THEN 1 END) AS draft_invoices,
      COUNT(CASE WHEN i.status = 'sent' THEN 1 END) AS sent_invoices,
      COUNT(CASE WHEN i.status = 'paid' THEN 1 END) AS paid_invoices,
      COUNT(DISTINCT i.customer_id) AS customers,
      COALESCE(SUM(CASE WHEN i.status = 'sent' THEN i.total ELSE 0 END), 0) AS owing
    FROM months
    LEFT JOIN (
      SELECT 
        inv.id,
        inv.customer_id,
        inv.total,
        inv.created_at,
        inv.org_id,
        inv.status
      FROM invoices inv
    ) i 
      ON date_trunc('month', i.created_at) = months.month 
      AND i.org_id = ${orgId}
    GROUP BY months.month
    ORDER BY months.month ASC;
  `;

  // Map strings to numbers because Postgres aggregates return strings
  return data.map((row) => ({
    name: row.name,
    revenue: Number(row.revenue),
    invoices: Number(row.invoices),
    draftInvoices: Number(row.draft_invoices),
    sentInvoices: Number(row.sent_invoices),
    paidInvoices: Number(row.paid_invoices),
    customers: Number(row.customers),
    owing: Number(row.owing),
  }));
}

/**
 * What's overdue right now, across all months: sent invoices whose due date
 * has passed (see src/lib/overdue.ts). Nothing invalidates this when a due
 * date passes, so the "hours" cache life bounds how stale it gets (an hour).
 */
export async function getOverdueStatsDb(
  orgId: string,
): Promise<{ count: number; total: number }> {
  "use cache";
  cacheLife("hours");
  cacheTag(`stats-${orgId}`);
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }

  const sql = neon(process.env.DATABASE_URL);

  const [row] = await sql`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(total), 0) AS total
    FROM invoices
    WHERE org_id = ${orgId}
      AND status = 'sent'
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
  `;

  return { count: Number(row.count), total: Number(row.total) };
}
