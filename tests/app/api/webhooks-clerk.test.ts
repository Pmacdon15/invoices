// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
  deleteOrgData: vi.fn(),
  rebalanceOrgItems: vi.fn(),
}));
vi.mock("@clerk/backend/webhooks", () => ({
  verifyWebhook: mocks.verifyWebhook,
}));
vi.mock("@/db/utils", () => ({
  deleteOrgData: mocks.deleteOrgData,
  rebalanceOrgItems: mocks.rebalanceOrgItems,
}));

import { POST } from "@/app/api/webhooks/clerk/route";

const request = () =>
  new NextRequest("https://example.test/api/webhooks/clerk", {
    method: "POST",
    body: "{}",
  });

const deliver = async (event: unknown) => {
  mocks.verifyWebhook.mockResolvedValue(event);
  return POST(request());
};

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "whsec_test");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("verifies the request with the signing secret", async () => {
    const req = request();
    mocks.verifyWebhook.mockResolvedValue({ type: "user.created", data: {} });
    await POST(req);
    expect(mocks.verifyWebhook).toHaveBeenCalledWith(req, {
      signingSecret: "whsec_test",
    });
  });

  it("rejects a request that fails verification", async () => {
    mocks.verifyWebhook.mockRejectedValue(new Error("bad signature"));
    const res = await POST(request());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid webhook" });
    expect(mocks.rebalanceOrgItems).not.toHaveBeenCalled();
    expect(mocks.deleteOrgData).not.toHaveBeenCalled();
  });

  it("rebalances the paying organization when a subscription activates", async () => {
    const res = await deliver({
      type: "subscriptionItem.active",
      data: { payer: { organization_id: "org_1" } },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mocks.rebalanceOrgItems).toHaveBeenCalledWith("org_1");
  });

  it("skips the rebalance for a subscription with no organization", async () => {
    for (const data of [{ payer: {} }, {}]) {
      const res = await deliver({ type: "subscriptionItem.active", data });
      expect(res.status).toBe(200);
    }
    expect(mocks.rebalanceOrgItems).not.toHaveBeenCalled();
  });

  it("deletes an organization's data when it is deleted", async () => {
    const res = await deliver({
      type: "organization.deleted",
      data: { id: "org_2" },
    });
    expect(res.status).toBe(200);
    expect(mocks.deleteOrgData).toHaveBeenCalledWith("org_2");
  });

  it("skips the delete when the event has no organization id", async () => {
    await deliver({ type: "organization.deleted", data: {} });
    expect(mocks.deleteOrgData).not.toHaveBeenCalled();
  });

  it("acknowledges events it doesn't handle", async () => {
    const res = await deliver({ type: "user.created", data: { id: "u" } });
    expect(res.status).toBe(200);
    expect(mocks.rebalanceOrgItems).not.toHaveBeenCalled();
    expect(mocks.deleteOrgData).not.toHaveBeenCalled();
  });

  it("returns a 400 when handling the event fails", async () => {
    mocks.deleteOrgData.mockRejectedValue(new Error("db down"));
    const res = await deliver({
      type: "organization.deleted",
      data: { id: "org_2" },
    });
    expect(res.status).toBe(400);
  });
});
