// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  // Hand back the route handler itself so the test can call it directly.
  clerkMiddleware: (handler: unknown) => handler,
}));

import proxy, { config } from "@/proxy";

type Auth = () => Promise<{
  userId: string | null;
  has: (check: { feature: string }) => boolean;
}>;
type Handler = (auth: Auth, req: NextRequest) => Promise<Response | undefined>;

const run = async (
  path: string,
  features: string[] = [],
  userId: string | null = "user_1",
) => {
  const has = vi.fn(({ feature }: { feature: string }) =>
    features.includes(feature),
  );
  const auth = vi.fn(async () => ({ userId, has }));
  const response = await (proxy as unknown as Handler)(
    auth,
    new NextRequest(`https://example.test${path}`),
  );
  return { auth, has, response };
};

const signedInPages = [
  "/invoices",
  "/invoices/new",
  "/invoices/12",
  "/customers",
  "/customers?page=2",
  "/products",
];

describe("proxy", () => {
  it("sends /stats home without the stats feature", async () => {
    const { response, has } = await run("/stats");
    expect(has).toHaveBeenCalledWith({ feature: "stats" });
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://example.test/");
  });

  it("lets /stats through with the stats feature", async () => {
    const { response } = await run("/stats", ["stats"]);
    expect(response).toBeUndefined();
  });

  it.each(
    signedInPages,
  )("lets a signed-in user open %s without the stats feature", async (path) => {
    const { response } = await run(path);
    expect(response).toBeUndefined();
  });

  it.each([
    ...signedInPages,
    "/stats",
  ])("sends a signed-out visitor from %s home", async (path) => {
    const { response } = await run(path, ["stats"], null);
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://example.test/");
  });

  it.each([
    "/",
    "/plans",
    "/privacy",
    "/terms",
    "/api/customers/search",
  ])("leaves %s alone without checking auth", async (path) => {
    const { response, auth } = await run(path);
    expect(auth).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });
});

describe("proxy matcher", () => {
  const [pages, always] = config.matcher.map((m) => new RegExp(`^${m}$`));
  const matches = (path: string) => pages.test(path) || always.test(path);

  it("runs on pages and API routes", () => {
    for (const path of ["/", "/stats", "/invoices/1", "/api/webhooks/clerk"]) {
      expect(matches(path), path).toBe(true);
    }
  });

  it("skips Next internals and static files", () => {
    for (const path of [
      "/_next/static/chunk.js",
      "/favicon.ico",
      "/logo.png",
    ]) {
      expect(pages.test(path), path).toBe(false);
    }
  });
});
