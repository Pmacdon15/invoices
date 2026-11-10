// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  getAllOrgIds: vi.fn(),
  rebalanceOrgItems: vi.fn(),
}));
vi.mock("@/db/utils", () => db);

import { GET } from "@/app/api/cron/rebalance/route";

const call = (authorization?: string) =>
  GET(
    new Request("https://example.test/api/cron/rebalance", {
      headers: authorization ? { authorization } : {},
    }),
  );

describe("GET /api/cron/rebalance", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects a request with no authorization", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
    expect(db.getAllOrgIds).not.toHaveBeenCalled();
  });

  it("rejects the wrong secret", async () => {
    const res = await call("Bearer nope");
    expect(res.status).toBe(401);
    expect(db.getAllOrgIds).not.toHaveBeenCalled();
  });

  it("rejects the secret without the Bearer scheme", async () => {
    expect((await call("s3cret")).status).toBe(401);
  });

  it("rebalances every organization in turn", async () => {
    db.getAllOrgIds.mockResolvedValue([
      { org_id: "org_a" },
      { org_id: "org_b" },
    ]);
    db.rebalanceOrgItems.mockResolvedValue(undefined);

    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, processed: 2 });
    expect(db.rebalanceOrgItems.mock.calls).toEqual([["org_a"], ["org_b"]]);
  });

  it("succeeds with no organizations", async () => {
    db.getAllOrgIds.mockResolvedValue([]);
    const res = await call("Bearer s3cret");
    expect(await res.json()).toEqual({ success: true, processed: 0 });
    expect(db.rebalanceOrgItems).not.toHaveBeenCalled();
  });

  it("returns a 500 when a rebalance fails", async () => {
    db.getAllOrgIds.mockResolvedValue([{ org_id: "org_a" }]);
    db.rebalanceOrgItems.mockRejectedValue(new Error("db down"));

    const res = await call("Bearer s3cret");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      success: false,
      error: "Error: db down",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
