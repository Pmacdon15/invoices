import type { AuthInfo } from "@modelcontextprotocol/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bearerToken,
  callerLabel,
  mcpResourceUrl,
  mcpRoute,
  messagesFromEventStream,
  preflight,
  publicOrigin,
  resourceMetadataUrl,
  unauthorized,
  withCors,
} from "@/mcp/http";

/*
 * The HTTP edge, written to the MCP and OAuth specs so every client (Claude,
 * ChatGPT, Gemini, Muse) connects the same way.
 */

const URL_ = "https://www.invoicepro.patmac.ca/api/mcp";
const authInfo: AuthInfo = {
  token: "oat_1",
  clientId: "client",
  scopes: [],
  extra: { userId: "user_1" },
};

const post = (headers: Record<string, string> = {}, body = "{}") =>
  new Request(URL_, {
    method: "POST",
    headers: { authorization: "Bearer oat_1", ...headers },
    body,
  });

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("origins", () => {
  it("names the production domain in production, whatever host was used", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv(
      "VERCEL_PROJECT_PRODUCTION_URL",
      "https://www.invoicepro.patmac.ca/",
    );
    const req = new Request("https://invoices-abc.vercel.app/api/mcp");
    expect(publicOrigin(req)).toBe("https://www.invoicepro.patmac.ca");
    expect(mcpResourceUrl(req)).toBe(URL_);
    expect(resourceMetadataUrl(req)).toBe(
      "https://www.invoicepro.patmac.ca/.well-known/oauth-protected-resource/api/mcp",
    );
  });

  it("uses the request's own host on previews", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(
      publicOrigin(new Request("https://invoices-abc.vercel.app/api/mcp")),
    ).toBe("https://invoices-abc.vercel.app");
  });
});

describe("bearer tokens and challenges", () => {
  it("reads the token whatever the scheme's letter case", () => {
    const req = (value?: string) =>
      new Request(URL_, value ? { headers: { authorization: value } } : {});
    expect(bearerToken(req("Bearer abc"))).toBe("abc");
    expect(bearerToken(req("bearer abc"))).toBe("abc");
    expect(bearerToken(req("BEARER   abc  "))).toBe("abc");
    expect(bearerToken(req("Basic abc"))).toBeUndefined();
    expect(bearerToken(req())).toBeUndefined();
  });

  it("challenges without an error code when no token was sent", async () => {
    const res = unauthorized(new Request(URL_));
    expect(res.status).toBe(401);
    const header = res.headers.get("www-authenticate") ?? "";
    expect(header).not.toContain("error=");
    expect(header).toContain('scope="profile email offline_access"');
    await expect(res.json()).resolves.toMatchObject({ error: "unauthorized" });
  });

  it("says invalid_token, without quotes from the reason, for a bad token", async () => {
    const res = unauthorized(new Request(URL_), 'bad "token"\\');
    expect(res.headers.get("www-authenticate")).toContain(
      'error="invalid_token", error_description="bad token"',
    );
    await expect(res.json()).resolves.toMatchObject({
      error: "invalid_token",
    });
  });

  it("labels the caller by user agent for logs", () => {
    expect(
      callerLabel(
        new Request(URL_, { headers: { "user-agent": "Gemini   Agent/1" } }),
      ),
    ).toBe("Gemini Agent/1");
    expect(callerLabel(new Request(URL_))).toBe("no user agent");
  });
});

describe("CORS", () => {
  it("adds CORS headers and keeps the response", async () => {
    const res = withCors(
      new Response("hi", { status: 201, headers: { "x-a": "1" } }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("x-a")).toBe("1");
    expect(res.headers.get("access-control-expose-headers")).toContain(
      "WWW-Authenticate",
    );
    await expect(res.text()).resolves.toBe("hi");
  });

  it("echoes requested headers in the preflight", () => {
    const res = preflight(
      new Request(URL_, {
        method: "OPTIONS",
        headers: { "access-control-request-headers": "x-custom" },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-headers")).toBe("x-custom");
    expect(res.headers.get("vary")).toBe("Access-Control-Request-Headers");
    expect(
      preflight(new Request(URL_, { method: "OPTIONS" })).headers.get(
        "access-control-allow-headers",
      ),
    ).toContain("Authorization");
  });
});

describe("event streams", () => {
  it("parses the JSON-RPC messages in a finished stream", () => {
    expect(
      messagesFromEventStream(
        'event: message\ndata: {"id":1}\n\nevent: message\r\ndata: {"a":\r\ndata: 2}\r\n\r\n: comment\n\n',
      ),
    ).toEqual([{ id: 1 }, { a: 2 }]);
  });
});

describe("mcpRoute", () => {
  it("answers OPTIONS without auth", async () => {
    const handler = vi.fn();
    const route = mcpRoute(handler, vi.fn());
    const res = await route(new Request(URL_, { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(handler).not.toHaveBeenCalled();
  });

  it("refuses a token the verifier throws on", async () => {
    const route = mcpRoute(vi.fn(), async () => {
      throw new Error("clerk down");
    });
    const res = await route(post());
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("invalid_token");
  });

  it("refuses an expired token", async () => {
    const route = mcpRoute(vi.fn(), async () => ({
      ...authInfo,
      expiresAt: 1,
    }));
    const res = await route(post());
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error_description: "The access token has expired.",
    });
  });

  it("skips the user limit when the token carries no user", async () => {
    const limit = vi.fn();
    const handler = vi.fn(async () => new Response("ok"));
    const route = mcpRoute(
      handler,
      async () => ({ ...authInfo, extra: {} }),
      limit,
    );
    expect((await route(post())).status).toBe(200);
    expect(limit).not.toHaveBeenCalled();
  });

  it("passes stream-accepting requests through with the verified auth", async () => {
    const handler = vi.fn(async (req: Request) => {
      expect((req as Request & { auth: AuthInfo }).auth).toBe(authInfo);
      return new Response('data: {"id":1}\n\n', {
        headers: { "content-type": "text/event-stream" },
      });
    });
    const route = mcpRoute(handler, async () => authInfo);
    const req = post({ accept: "application/json, text/event-stream" });
    const res = await route(req);
    expect(handler.mock.calls[0][0]).toBe(req);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
  });

  it("passes GET and DELETE through untouched", async () => {
    const handler = vi.fn(
      async (_req: Request) => new Response(null, { status: 405 }),
    );
    const route = mcpRoute(handler, async () => authInfo);
    const req = new Request(URL_, {
      method: "GET",
      headers: { authorization: "Bearer oat_1" },
    });
    expect((await route(req)).status).toBe(405);
    expect(handler.mock.calls[0][0]).toBe(req);
  });

  it("answers JSON-only clients with plain JSON", async () => {
    let seenAccept = "";
    const handler = vi.fn(async (req: Request) => {
      seenAccept = req.headers.get("accept") ?? "";
      expect(await req.text()).toBe('{"x":1}');
      return new Response('event: message\ndata: {"id":1,"result":{}}\n\n', {
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "mcp-session-id": "s1",
        },
      });
    });
    const route = mcpRoute(handler, async () => authInfo);
    const res = await route(post({ accept: "application/json" }, '{"x":1}'));
    expect(seenAccept).toBe("application/json, text/event-stream");
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("cache-control")).toBeNull();
    expect(res.headers.get("mcp-session-id")).toBe("s1");
    await expect(res.json()).resolves.toEqual({ id: 1, result: {} });
  });

  it("answers a JSON-only batch with an array, and nothing with 202", async () => {
    const stream = (body: string) => async () =>
      new Response(body, { headers: { "content-type": "text/event-stream" } });
    const batch = mcpRoute(
      vi.fn(stream('data: {"id":1}\n\ndata: {"id":2}\n\n')),
      async () => authInfo,
    );
    await expect((await batch(post())).json()).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ]);
    const empty = mcpRoute(vi.fn(stream("")), async () => authInfo);
    expect((await empty(post())).status).toBe(202);
  });

  it("leaves a JSON answer to a JSON-only client as it is", async () => {
    const route = mcpRoute(
      vi.fn(async () => Response.json({ ok: true })),
      async () => authInfo,
    );
    const res = await route(post({ accept: "*/*" }));
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("answers a stream-only client with the stream", async () => {
    const route = mcpRoute(
      vi.fn(
        async () =>
          new Response("data: {}\n\n", {
            headers: { "content-type": "text/event-stream" },
          }),
      ),
      async () => authInfo,
    );
    const res = await route(post({ accept: "text/event-stream" }));
    expect(res.headers.get("content-type")).toBe("text/event-stream");
  });

  it("treats a missing content type as not a stream", async () => {
    const route = mcpRoute(
      vi.fn(async () => new Response(null, { status: 204 })),
      async () => authInfo,
    );
    const res = await route(post());
    expect(res.status).toBe(204);
  });

  it("goes on when the IP is under its limit", async () => {
    const preAuth = vi.fn(async () => ({ ok: true as const }));
    const route = mcpRoute(
      vi.fn(async () => new Response("ok")),
      async () => authInfo,
      undefined,
      preAuth,
    );
    expect((await route(post())).status).toBe(200);
    expect(preAuth).toHaveBeenCalledWith("unknown");
  });
});
