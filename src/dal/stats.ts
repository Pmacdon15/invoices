import { auth } from "@clerk/nextjs/server";
import { getStatsDb } from "@/db/stats";

export async function getStatsDal() {
  const { orgId, has } = await auth.protect();

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
