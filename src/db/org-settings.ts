import { neon } from "@neondatabase/serverless";
import { cacheTag } from "next/cache";
import type { OrgSettings } from "@/dal/types";
import { DEFAULT_INVOICE_PREFIX } from "@/lib/invoice-number";

/** An organization's settings; the defaults until it saves any. */
export async function getOrgSettingsDb(orgId: string): Promise<OrgSettings> {
  "use cache";
  cacheTag(`org-settings-${orgId}`);

  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const [row] = (await sql`
    SELECT org_id, invoice_prefix, last_invoice_number
    FROM org_settings
    WHERE org_id = ${orgId}
  `) as OrgSettings[];

  return (
    row ?? {
      org_id: orgId,
      invoice_prefix: DEFAULT_INVOICE_PREFIX,
      last_invoice_number: 0,
    }
  );
}

/**
 * Sets the prefix new invoices are numbered with. Invoices already made keep
 * the prefix they were numbered with.
 */
export async function updateInvoicePrefixDb(
  orgId: string,
  prefix: string,
): Promise<OrgSettings> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Config Error");
  }
  const sql = neon(process.env.DATABASE_URL);
  const [row] = (await sql`
    INSERT INTO org_settings (org_id, invoice_prefix)
    VALUES (${orgId}, ${prefix})
    ON CONFLICT (org_id) DO UPDATE SET invoice_prefix = EXCLUDED.invoice_prefix
    RETURNING org_id, invoice_prefix, last_invoice_number
  `) as OrgSettings[];
  return row;
}
