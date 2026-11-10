import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  memberships: vi.fn(),
  subscription: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { getOrganizationMembershipList: mocks.memberships },
    billing: { getOrganizationBillingSubscription: mocks.subscription },
  }),
}));

import {
  callerFrom,
  contextFor,
  listCallerOrgs,
  orgPlanFeatures,
  pickOrg,
} from "@/mcp/caller";

const membership = (id: string, name: string, slug: string | null) => ({
  role: "org:admin",
  organization: { id, name, slug },
});

const orgs = [
  { org_id: "org_1", name: "Pat's Plumbing", slug: "pats", role: "org:admin" },
  { org_id: "org_2", name: "Side Gig", slug: null, role: "org:member" },
];

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("callerFrom", () => {
  it("takes the user only from verified auth", () => {
    expect(
      callerFrom(
        { token: "t", clientId: "c", scopes: [], extra: { userId: "user_1" } },
        "claude",
      ),
    ).toEqual({ userId: "user_1", client: "claude" });
    expect(
      callerFrom({
        token: "t",
        clientId: "c",
        scopes: [],
        extra: { userId: "u" },
      }),
    ).toEqual({ userId: "u", client: null });
    expect(callerFrom(undefined)).toBeNull();
    expect(
      callerFrom({
        token: "t",
        clientId: "c",
        scopes: [],
        extra: { userId: "" },
      }),
    ).toBeNull();
  });
});

describe("organizations", () => {
  it("lists the user's memberships", async () => {
    mocks.memberships.mockResolvedValue({
      data: [
        membership("org_1", "Pat's Plumbing", "pats"),
        membership("org_2", "Side Gig", null),
      ],
    });
    await expect(listCallerOrgs("user_1")).resolves.toEqual([
      {
        org_id: "org_1",
        name: "Pat's Plumbing",
        slug: "pats",
        role: "org:admin",
      },
      { org_id: "org_2", name: "Side Gig", slug: null, role: "org:admin" },
    ]);
    expect(mocks.memberships).toHaveBeenCalledWith({
      userId: "user_1",
      limit: 100,
    });
  });

  it("picks the only org, or the one named by ID, slug or name", () => {
    expect(pickOrg([orgs[0]])).toEqual({ ok: true, org: orgs[0] });
    expect(pickOrg(orgs, "ORG_2")).toEqual({ ok: true, org: orgs[1] });
    expect(pickOrg(orgs, "pats")).toEqual({ ok: true, org: orgs[0] });
    expect(pickOrg(orgs, " side gig ")).toEqual({ ok: true, org: orgs[1] });
    expect(pickOrg(orgs, "nope")).toMatchObject({
      ok: false,
      status: "not_found",
    });
    expect(pickOrg(orgs)).toMatchObject({
      ok: false,
      status: "multiple_organizations",
    });
    expect(pickOrg(orgs, "  ")).toMatchObject({
      ok: false,
      status: "multiple_organizations",
    });
    expect(pickOrg([])).toMatchObject({
      ok: false,
      status: "no_organizations",
    });
  });

  it("reads the plan's feature slugs, or none when billing fails", async () => {
    mocks.subscription.mockResolvedValueOnce({
      subscriptionItems: [
        { plan: { features: [{ slug: "stats" }, { slug: "send_email" }] } },
        { plan: null },
        { plan: { features: undefined } },
      ],
    });
    await expect(orgPlanFeatures("org_1")).resolves.toEqual(
      new Set(["stats", "send_email"]),
    );
    mocks.subscription.mockRejectedValueOnce(new Error("404"));
    await expect(orgPlanFeatures("org_1")).resolves.toEqual(new Set());
  });
});

describe("contextFor", () => {
  const caller = { userId: "user_1", client: null };

  it("builds the data-layer context with the plan's features", async () => {
    mocks.memberships.mockResolvedValue({
      data: [membership("org_1", "Pat's Plumbing", "pats")],
    });
    mocks.subscription.mockResolvedValue({
      subscriptionItems: [
        { plan: { features: [{ slug: "stats" }, { slug: "send_email" }] } },
      ],
    });
    const result = await contextFor(caller);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ctx).toMatchObject({ orgId: "org_1", userId: "user_1" });
    expect(result.ctx.has({ feature: "send_email" })).toBe(true);
    expect(
      result.ctx.has({ feature: "create_up_to_100_invoices_a_month" }),
    ).toBe(false);
  });

  it("refuses an org whose plan has no app access", async () => {
    mocks.memberships.mockResolvedValue({
      data: [membership("org_1", "Pat's Plumbing", "pats")],
    });
    mocks.subscription.mockResolvedValue({ subscriptionItems: [] });
    await expect(contextFor(caller)).resolves.toMatchObject({
      ok: false,
      status: "no_app_access",
    });
  });

  it.each([
    [[], undefined, "no_organizations", "don't belong"],
    [
      [membership("org_1", "A", null), membership("org_2", "B", null)],
      undefined,
      "multiple_organizations",
      "more than one",
    ],
    [[membership("org_1", "A", null)], "zzz", "not_found", 'matches "zzz"'],
  ])("explains why there's no organization (%#)", async (data, requested, status, text) => {
    mocks.memberships.mockResolvedValue({ data });
    const result = await contextFor(caller, requested);
    expect(result).toMatchObject({ ok: false, status });
    expect(!result.ok && result.message).toContain(text);
  });
});
