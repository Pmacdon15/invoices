import { getStatsDb } from "@/db/stats";
import { type AuthContext, resolveAuth } from "@/lib/auth-context";

export async function getStatsDal(ctx?: AuthContext) {
  const { orgId, has } = await resolveAuth(ctx);

  if (!orgId) {
    return { data: null, error: "Not authorized" };
  }

  if (!has({ feature: "stats" })) {
    return { data: null, error: "Missing feature: stats" };
  }

  try {
    const data = await getStatsDb(orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Failed to fetch stats." };
  }
}
