import { auth } from "@clerk/nextjs/server";

/*
 * Who a data-layer call runs for: an organization and what its plan allows.
 *
 * In the web app this is the signed-in Clerk session (`auth.protect()`). The
 * MCP server has no session, so it builds the same shape from the verified
 * OAuth token's user, the organization they chose and that organization's
 * plan features (see src/mcp/caller.ts). Every DAL function takes one as its
 * optional last argument, so both paths share one set of checks.
 */
export interface AuthContext {
  orgId?: string | null;
  userId?: string | null;
  has: (params: { feature: string }) => boolean;
}

/** The given context, or the signed-in session's when there isn't one. */
export async function resolveAuth(ctx?: AuthContext): Promise<AuthContext> {
  if (ctx) return ctx;
  return auth.protect();
}
