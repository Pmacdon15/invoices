import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ protect: vi.fn(), getStatsDb: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: mocks.protect } }));
vi.mock("@/db/stats", () => ({ getStatsDb: mocks.getStatsDb }));

import { getStatsDal } from "@/dal/stats";

function signIn(features: string[], orgId: string | null = "org_1") {
  mocks.protect.mockResolvedValue({
    orgId,
    has: ({ feature }: { feature: string }) => features.includes(feature),
  });
}

describe("getStatsDal", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns the org's stats when the plan includes them", async () => {
    signIn(["stats"]);
    mocks.getStatsDb.mockResolvedValue([{ name: "Jan", revenue: 10 }]);

    await expect(getStatsDal()).resolves.toEqual({
      data: [{ name: "Jan", revenue: 10 }],
      error: null,
    });
    expect(mocks.getStatsDb).toHaveBeenCalledWith("org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn(["stats"], null);
    await expect(getStatsDal()).resolves.toEqual({
      data: null,
      error: "Not authorized",
    });
    expect(mocks.getStatsDb).not.toHaveBeenCalled();
  });

  it("refuses a plan without the stats feature", async () => {
    signIn([]);
    await expect(getStatsDal()).resolves.toEqual({
      data: null,
      error: "Missing feature: stats",
    });
    expect(mocks.getStatsDb).not.toHaveBeenCalled();
  });

  it("reports a database failure", async () => {
    signIn(["stats"]);
    mocks.getStatsDb.mockRejectedValue(new Error("down"));
    await expect(getStatsDal()).resolves.toEqual({
      data: null,
      error: "Failed to fetch stats.",
    });
  });
});
