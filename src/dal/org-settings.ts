import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import { getOrgSettingsDb, updateInvoicePrefixDb } from "@/db/org-settings";
import { type AuthContext, resolveAuth } from "@/lib/auth-context";
import { InvoicePrefixSchema } from "./schema";
import type { OrgSettings, Result } from "./types";

export const ORG_ADMIN_ROLE = "org:admin";

export async function getOrgSettingsDal(
  ctx?: AuthContext,
): Promise<Result<OrgSettings>> {
  const { orgId } = await resolveAuth(ctx);
  if (!orgId) {
    return { data: null, error: "No org" };
  }
  try {
    const data = await getOrgSettingsDb(orgId);
    return { data, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return { data: null, error: "Failed to fetch settings." };
  }
}

/** Sets the prefix new invoice numbers get (admins only). */
export async function updateInvoicePrefixDal(
  prefix: string,
  ctx?: AuthContext,
) {
  const { orgId, orgRole } = await resolveAuth(ctx);
  if (!orgId) {
    return errAsync({ reason: "Not authorized" } as const);
  }
  if (orgRole !== ORG_ADMIN_ROLE) {
    return errAsync({ reason: "Admins only" } as const);
  }

  const validation = InvoicePrefixSchema.safeParse(prefix);
  if (!validation.success) {
    return errAsync({
      reason: "Validation failed",
      errors: z.treeifyError(validation.error),
    } as const);
  }

  try {
    const settings = await updateInvoicePrefixDb(orgId, validation.data);
    return okAsync(settings);
  } catch (e: unknown) {
    console.error("Database Update Error:", e);
    return errAsync({ reason: "Db failed to update settings" } as const);
  }
}
