import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ctxWith } from "./helpers";

/*
 * Every registered tool runs for the verified caller in their organization,
 * and turns bad input or a crash into a readable tool error.
 */

const mocks = vi.hoisted(() => {
  const tool = vi.fn();
  return {
    contextFor: vi.fn(),
    tool,
    /** The module with every *Tool function replaced by `tool`. */
    stubTools: async (
      importOriginal: () => Promise<Record<string, unknown>>,
    ) => {
      const real = await importOriginal();
      return Object.fromEntries(
        Object.entries(real).map(([name, value]) => [
          name,
          name.endsWith("Tool")
            ? (...args: unknown[]) => tool(name, ...args)
            : value,
        ]),
      );
    },
  };
});

vi.mock("@/mcp/catalog-tools", (i) => mocks.stubTools(i as never));
vi.mock("@/mcp/invoice-tools", (i) => mocks.stubTools(i as never));
vi.mock("@/mcp/org-tools", (i) => mocks.stubTools(i as never));
vi.mock("@/mcp/caller", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/mcp/caller")>()),
  contextFor: mocks.contextFor,
}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn(), auth: {} }));

import {
  registerInvoiceTools,
  SERVER_INFO,
  SERVER_OPTIONS,
} from "@/mcp/server";

type Handler = (
  args: Record<string, unknown>,
  extra: { http?: { authInfo?: unknown } },
) => Promise<{
  content: { text: string }[];
  isError?: boolean;
  structuredContent: Record<string, unknown>;
}>;

function registered(clientName?: string) {
  const handlers = new Map<string, Handler>();
  const server = {
    registerTool: (name: string, _config: unknown, handler: Handler) =>
      handlers.set(name, handler),
    registerResource: vi.fn(),
    server: {
      getClientVersion: () => (clientName ? { name: clientName } : undefined),
    },
  };
  registerInvoiceTools(server as never);
  return handlers;
}

const signedIn = {
  http: {
    authInfo: {
      token: "t",
      clientId: "c",
      scopes: [],
      extra: { userId: "user_1" },
    },
  },
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.contextFor.mockResolvedValue({ ok: true, ctx: ctxWith() });
  mocks.tool.mockImplementation(async (name: string) => ({
    summary: `ran ${name}`,
    data: { name },
  }));
});

describe("server", () => {
  it("advertises its name and that its lists never change", () => {
    expect(SERVER_INFO.name).toBe("invoicepro");
    expect(SERVER_OPTIONS.capabilities.tools.listChanged).toBe(false);
  });

  it("runs every tool for the signed-in caller, passing org_id on", async () => {
    const handlers = registered("claude-ai");
    expect(handlers.size).toBe(21);
    for (const [name, handler] of handlers) {
      mocks.tool.mockClear();
      const result = await handler({ org_id: "pats" }, signedIn);
      expect(result.isError, name).toBeUndefined();
      expect(mocks.tool).toHaveBeenCalledTimes(1);
      if (name !== "list_organizations") {
        expect(mocks.contextFor).toHaveBeenLastCalledWith(
          { userId: "user_1", client: "claude-ai" },
          "pats",
        );
      }
    }
  });

  it("asks to sign in again without verified auth", async () => {
    const handlers = registered();
    for (const name of ["list_organizations", "get_invoice"]) {
      const result = await handlers.get(name)?.({}, {});
      expect(result?.isError).toBe(true);
      expect(result?.content[0].text).toContain("Not signed in");
    }
    expect(mocks.tool).not.toHaveBeenCalled();
  });

  it("explains when no organization can be chosen", async () => {
    mocks.contextFor.mockResolvedValue({
      ok: false,
      status: "multiple_organizations",
      message: "Pick one.",
      organizations: [{ org_id: "org_1" }, { org_id: "org_2" }],
    });
    const result = await registered().get("list_invoices")?.({}, signedIn);
    expect(result?.isError).toBe(true);
    expect(result?.structuredContent).toMatchObject({
      status: "multiple_organizations",
      organizations: [{ org_id: "org_1" }, { org_id: "org_2" }],
    });
    expect(mocks.tool).not.toHaveBeenCalled();
  });

  it("turns validation errors and crashes into tool errors", async () => {
    const handlers = registered();
    mocks.tool.mockImplementationOnce(async () => {
      z.object({ items: z.array(z.string()).min(1) }).parse({ items: [] });
    });
    const invalid = await handlers.get("create_invoice")?.({}, signedIn);
    expect(invalid?.content[0].text).toMatch(/^Invalid input: items: /);

    mocks.tool.mockImplementationOnce(async () => {
      z.string().parse(1);
    });
    const root = await handlers.get("create_invoice")?.({}, signedIn);
    expect(root?.content[0].text).toMatch(/^Invalid input: input: /);

    mocks.tool.mockRejectedValueOnce(new Error("boom"));
    const crash = await handlers.get("get_stats")?.({}, signedIn);
    expect(crash?.content[0].text).toBe(
      "Something went wrong in InvoicePro. Try again shortly.",
    );
  });
});
