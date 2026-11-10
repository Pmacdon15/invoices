import { createMcpHandler } from "mcp-handler";
import { verifyMcpToken } from "@/mcp/auth";
import { mcpRoute } from "@/mcp/http";
import { registerInvoicePrompts } from "@/mcp/prompts";
import {
  checkRateLimit,
  MCP_PREAUTH_IP_LIMIT,
  MCP_REQUEST_LIMIT,
} from "@/mcp/rate-limit";
import { registerInvoiceTools, SERVER_OPTIONS } from "@/mcp/server";

/*
 * /api/mcp — the InvoicePro MCP server.
 *
 * Auth is a Clerk OAuth access token in `Authorization: Bearer ...`. When
 * there isn't one, the 401 points the client at
 * `/.well-known/oauth-protected-resource/api/mcp`, which sends it to Clerk to
 * sign the user in. Every tool runs only for that token's verified Clerk user,
 * in an organization they belong to.
 */
const handler = createMcpHandler((server) => {
  registerInvoiceTools(server);
  registerInvoicePrompts(server);
}, SERVER_OPTIONS);

const route = mcpRoute(
  handler,
  verifyMcpToken,
  async (userId) => checkRateLimit(MCP_REQUEST_LIMIT, userId),
  async (ip) => checkRateLimit(MCP_PREAUTH_IP_LIMIT, ip),
);

export { route as DELETE, route as GET, route as OPTIONS, route as POST };
