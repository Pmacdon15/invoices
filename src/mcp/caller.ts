import { clerkClient } from "@clerk/nextjs/server";
import type { AuthInfo } from "@modelcontextprotocol/server";
import type { AuthContext } from "@/lib/auth-context";

/*
 * Who an MCP tool call runs for. The user comes only from the verified OAuth
 * token (never from tool arguments); the organization is the one they belong
 * to, or the one they name with `org_id` when they belong to several; and
 * what the plan allows comes from that organization's Clerk Billing
 * subscription, the same features `has()` checks in the web app.
 */

export type McpCaller = {
  userId: string;
  /** The AI app's name from the MCP handshake, for logs. */
  client: string | null;
};

export type OrgSummary = {
  org_id: string;
  name: string;
  slug: string | null;
  role: string;
};

/** The feature every signed-in page of the app requires (see src/proxy.ts). */
export const APP_ACCESS_FEATURE = "stats";

/** The verified caller from the request's auth, or null when there isn't one. */
export function callerFrom(
  authInfo: AuthInfo | undefined,
  clientName?: string | null,
): McpCaller | null {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) return null;
  return { userId, client: clientName ?? null };
}

/** The organizations the user belongs to. */
export async function listCallerOrgs(userId: string): Promise<OrgSummary[]> {
  const client = await clerkClient();
  const { data } = await client.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  });
  return data.map((m) => ({
    org_id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug ?? null,
    role: m.role,
  }));
}

/**
 * The slugs of the features the organization's plan includes. Any billing
 * error counts as no features, the same as a session without them.
 */
export async function orgPlanFeatures(orgId: string): Promise<Set<string>> {
  try {
    const client = await clerkClient();
    const subscription =
      await client.billing.getOrganizationBillingSubscription(orgId);
    return new Set(
      subscription.subscriptionItems.flatMap(
        (item) => item.plan?.features?.map((f) => f.slug) ?? [],
      ),
    );
  } catch (error) {
    console.warn(`MCP: couldn't read the plan of ${orgId}`, error);
    return new Set();
  }
}

export type OrgResolution =
  | { ok: true; org: OrgSummary }
  | {
      ok: false;
      status: "no_organizations" | "multiple_organizations" | "not_found";
      organizations: OrgSummary[];
    };

/**
 * The organization a call is for: the one named by `requested` (its ID, slug
 * or name, any letter case), or the user's only organization.
 */
export function pickOrg(
  orgs: OrgSummary[],
  requested?: string | null,
): OrgResolution {
  if (orgs.length === 0) {
    return { ok: false, status: "no_organizations", organizations: [] };
  }
  const wanted = requested?.trim().toLowerCase();
  if (wanted) {
    const match = orgs.find(
      (o) =>
        o.org_id.toLowerCase() === wanted ||
        o.slug?.toLowerCase() === wanted ||
        o.name.toLowerCase() === wanted,
    );
    return match
      ? { ok: true, org: match }
      : { ok: false, status: "not_found", organizations: orgs };
  }
  if (orgs.length === 1) return { ok: true, org: orgs[0] };
  return { ok: false, status: "multiple_organizations", organizations: orgs };
}

export type CallerContext = AuthContext & {
  orgId: string;
  userId: string;
  org: OrgSummary;
  features: Set<string>;
};

export type ContextResult =
  | { ok: true; ctx: CallerContext }
  | {
      ok: false;
      status:
        | "no_organizations"
        | "multiple_organizations"
        | "not_found"
        | "no_app_access";
      message: string;
      organizations: OrgSummary[];
    };

/** The data-layer context for a tool call, or why there can't be one. */
export async function contextFor(
  caller: McpCaller,
  requestedOrg?: string | null,
): Promise<ContextResult> {
  const orgs = await listCallerOrgs(caller.userId);
  const picked = pickOrg(orgs, requestedOrg);
  if (!picked.ok) {
    const message =
      picked.status === "no_organizations"
        ? "You don't belong to an InvoicePro organization yet. Create one in the app first."
        : picked.status === "not_found"
          ? `No organization of yours matches "${requestedOrg}". Pass one of these as org_id.`
          : "You belong to more than one organization. Ask the user which one, then pass its org_id.";
    return {
      ok: false,
      status: picked.status,
      message,
      organizations: picked.organizations,
    };
  }

  const features = await orgPlanFeatures(picked.org.org_id);
  if (!features.has(APP_ACCESS_FEATURE)) {
    return {
      ok: false,
      status: "no_app_access",
      message: `${picked.org.name}'s plan doesn't include InvoicePro access. Choose a plan in the app (Plans page) first.`,
      organizations: [picked.org],
    };
  }

  return {
    ok: true,
    ctx: {
      orgId: picked.org.org_id,
      userId: caller.userId,
      org: picked.org,
      features,
      has: ({ feature }) => features.has(feature),
    },
  };
}
