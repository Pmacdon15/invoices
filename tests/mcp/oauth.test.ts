// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET as authServerGet,
  OPTIONS as authServerOptions,
} from "@/app/.well-known/oauth-authorization-server/[[...path]]/route";
import {
  GET as protectedResourceGet,
  OPTIONS as protectedResourceOptions,
} from "@/app/.well-known/oauth-protected-resource/[[...resource]]/route";
import {
  GET as openIdGet,
  OPTIONS as openIdOptions,
} from "@/app/.well-known/openid-configuration/[[...path]]/route";
import { clerkIssuer, configuredIssuer, MCP_SCOPES } from "@/mcp/oauth-config";
import { protectedResourceMetadata } from "@/mcp/oauth-metadata";

/*
 * OAuth discovery for MCP clients: where to sign in (this app's Clerk
 * instance) and what to ask for.
 */

// "clerk.example.test$" base64-encoded, as Clerk publishable keys carry it.
const KEY = `pk_test_${btoa("clerk.example.test$")}`;
const ISSUER = "https://clerk.example.test";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("oauth config", () => {
  it("decodes the Clerk issuer from the publishable key", () => {
    expect(clerkIssuer(KEY)).toBe(ISSUER);
    expect(
      clerkIssuer(
        `pk_live_${btoa("a-b.example.test$").replace(/\+/g, "-").replace(/\//g, "_")}`,
      ),
    ).toBe("https://a-b.example.test");
    expect(configuredIssuer()).toBe(ISSUER);
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    expect(configuredIssuer()).toBeNull();
  });

  it("asks for a refresh token so Gemini stays linked", () => {
    expect(MCP_SCOPES).toContain("offline_access");
  });
});

describe("protected resource metadata", () => {
  it("names this MCP endpoint and Clerk", async () => {
    const res = protectedResourceGet(
      new Request(
        "https://www.invoicepro.patmac.ca/.well-known/oauth-protected-resource/api/mcp",
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    await expect(res.json()).resolves.toEqual(
      protectedResourceMetadata(
        new Request("https://www.invoicepro.patmac.ca/x"),
        ISSUER,
      ),
    );
    expect(
      protectedResourceMetadata(
        new Request("https://www.invoicepro.patmac.ca/x"),
        ISSUER,
      ),
    ).toMatchObject({
      resource: "https://www.invoicepro.patmac.ca/api/mcp",
      authorization_servers: [ISSUER],
      resource_name: "InvoicePro",
      scopes_supported: ["profile", "email", "offline_access"],
    });
  });

  it("says sign-in isn't configured without a Clerk key", () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    const res = protectedResourceGet(
      new Request("https://www.invoicepro.patmac.ca/.well-known/x"),
    );
    expect(res.status).toBe(503);
  });

  it("answers CORS preflights", () => {
    for (const options of [
      protectedResourceOptions,
      authServerOptions,
      openIdOptions,
    ]) {
      const res = options();
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    }
  });
});

describe("Clerk discovery mirrors", () => {
  it.each([
    ["oauth-authorization-server", authServerGet],
    ["openid-configuration", openIdGet],
  ])("serves Clerk's %s document from this domain", async (doc, get) => {
    const fetchMock = vi.fn(async () => Response.json({ issuer: ISSUER }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await get();
    expect(fetchMock).toHaveBeenCalledWith(
      `${ISSUER}/.well-known/${doc}`,
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ issuer: ISSUER });
  });

  it("answers 502 when Clerk doesn't", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 500 })),
    );
    expect((await authServerGet()).status).toBe(502);
  });

  it("answers 503 without a Clerk key", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    expect((await authServerGet()).status).toBe(503);
    expect((await openIdGet()).status).toBe(503);
  });
});
