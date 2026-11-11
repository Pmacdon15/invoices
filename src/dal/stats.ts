import { getOverdueStatsDb, getStatsDb } from "@/db/stats";
import { type AuthContext, resolveAuth } from "@/lib/auth-context";

/** The org, or why the caller can't see its stats. */
async function statsOrg(
  ctx?: AuthContext,
): Promise<{ orgId: string; error: null } | { orgId: null; error: string }> {
  const { orgId, has } = await resolveAuth(ctx);

  if (!orgId) {
    return { orgId: null, error: "Not authorized" };
  }

  if (!has({ feature: "stats" })) {
    return { orgId: null, error: "Missing feature: stats" };
  }

  return { orgId, error: null };
}

export async function getStatsDal(ctx?: AuthContext) {
  const org = await statsOrg(ctx);
  if (org.error !== null) return { data: null, error: org.error };

  try {
    const data = await getStatsDb(org.orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Failed to fetch stats." };
  }
}

/** The count and sum of the org's overdue invoices, as of today. */
export async function getOverdueStatsDal(ctx?: AuthContext) {
  const org = await statsOrg(ctx);
  if (org.error !== null) return { data: null, error: org.error };

  try {
    const data = await getOverdueStatsDb(org.orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Failed to fetch overdue stats." };
  }
}
