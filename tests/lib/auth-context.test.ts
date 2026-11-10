import { describe, expect, it, vi } from "vitest";

const protect = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/server", () => ({ auth: { protect } }));

import { resolveAuth } from "@/lib/auth-context";

describe("resolveAuth", () => {
  it("uses the given context without touching the session", async () => {
    const ctx = { orgId: "org_mcp", has: () => true };
    await expect(resolveAuth(ctx)).resolves.toBe(ctx);
    expect(protect).not.toHaveBeenCalled();
  });

  it("falls back to the signed-in session", async () => {
    const session = { orgId: "org_1", has: () => false };
    protect.mockResolvedValue(session);
    await expect(resolveAuth()).resolves.toBe(session);
  });
});
