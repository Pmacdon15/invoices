import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clerkClient: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: mocks.clerkClient }));

import { isOverMemberShipLimit } from "@/db/clerk";

const membership = (maxAllowedMemberships?: number, membersCount?: number) => ({
  organization: { maxAllowedMemberships, membersCount },
});

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.clerkClient.mockResolvedValue({
    organizations: { getOrganizationMembershipList: mocks.list },
  });
});

describe("isOverMemberShipLimit", () => {
  it("is false for an org with no memberships", async () => {
    mocks.list.mockResolvedValue({ data: [] });
    await expect(isOverMemberShipLimit("org_1")).resolves.toBe(false);
    expect(mocks.list).toHaveBeenCalledWith({ organizationId: "org_1" });
  });

  it("is false at the limit", async () => {
    mocks.list.mockResolvedValue({ data: [membership(3, 3)] });
    await expect(isOverMemberShipLimit("org_1")).resolves.toBe(false);
  });

  it("is true over the limit", async () => {
    mocks.list.mockResolvedValue({ data: [membership(3, 4)] });
    await expect(isOverMemberShipLimit("org_1")).resolves.toBe(true);
  });

  it("treats missing counts as zero", async () => {
    mocks.list.mockResolvedValue({ data: [{}] });
    await expect(isOverMemberShipLimit("org_1")).resolves.toBe(false);
    mocks.list.mockResolvedValue({ data: [membership(undefined, 1)] });
    await expect(isOverMemberShipLimit("org_1")).resolves.toBe(true);
  });

  it("fails closed when Clerk can't be reached", async () => {
    mocks.list.mockRejectedValue(new Error("down"));
    await expect(isOverMemberShipLimit("org_1")).resolves.toBe(true);
  });
});
