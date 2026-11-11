import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ctxWith, ORG } from "./helpers";

const mocks = vi.hoisted(() => ({
  memberships: vi.fn(),
  getOrganization: vi.fn(),
  updateLogo: vi.fn(),
  deleteLogo: vi.fn(),
  getStatsDal: vi.fn(),
  getOrgSettingsDal: vi.fn(),
  updateInvoicePrefixDal: vi.fn(),
  getOverdueStatsDal: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { getOrganizationMembershipList: mocks.memberships },
    organizations: {
      getOrganization: mocks.getOrganization,
      updateOrganizationLogo: mocks.updateLogo,
      deleteOrganizationLogo: mocks.deleteLogo,
    },
  }),
}));
vi.mock("@/dal/stats", () => ({
  getStatsDal: mocks.getStatsDal,
  getOverdueStatsDal: mocks.getOverdueStatsDal,
}));
vi.mock("@/dal/org-settings", () => ({
  getOrgSettingsDal: mocks.getOrgSettingsDal,
  updateInvoicePrefixDal: mocks.updateInvoicePrefixDal,
}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

import {
  getOrganizationTool,
  getStatsTool,
  listOrganizationsTool,
  manageLogoTool,
  setInvoicePrefixTool,
} from "@/mcp/org-tools";
import { err, ok } from "./helpers";

const ctx = ctxWith();
const caller = { userId: "user_1", client: null };
const membership = (id: string, name: string) => ({
  role: "org:admin",
  organization: { id, name, slug: null },
});

afterEach(() => vi.unstubAllGlobals());

describe("list_organizations", () => {
  it.each([
    [[], "don't belong"],
    [
      [membership("org_1", "Pat's Plumbing")],
      "one organization, Pat's Plumbing",
    ],
    [[membership("org_1", "A"), membership("org_2", "B")], "2 organizations"],
  ])("summarizes %#", async (data, text) => {
    mocks.memberships.mockResolvedValue({ data });
    expect((await listOrganizationsTool(caller)).summary).toContain(text);
  });
});

describe("get_organization", () => {
  beforeEach(() => {
    mocks.getOrgSettingsDal.mockResolvedValue({
      data: { org_id: ORG, invoice_prefix: "PAT", last_invoice_number: 41 },
      error: null,
    });
  });

  it("shows the invoice prefix and next number, or nothing when they can't load", async () => {
    mocks.getOrganization.mockResolvedValue({
      id: ORG,
      name: "Pat's Plumbing",
      hasImage: false,
    });
    const result = await getOrganizationTool(ctx);
    expect(mocks.getOrgSettingsDal).toHaveBeenCalledWith(ctx);
    expect(result.data.organization).toMatchObject({
      invoice_prefix: "PAT",
      next_invoice_number: "PAT-0042",
    });

    mocks.getOrgSettingsDal.mockResolvedValue({ data: null, error: "No org" });
    const failed = await getOrganizationTool(ctx);
    expect(failed.data.organization).toMatchObject({
      invoice_prefix: null,
      next_invoice_number: null,
    });
  });

  it("shows the plan and logo", async () => {
    mocks.getOrganization.mockResolvedValue({
      id: ORG,
      name: "Pat's Plumbing",
      slug: "pats",
      hasImage: true,
      imageUrl: "https://img.clerk.com/a.png",
    });
    const result = await getOrganizationTool(ctx);
    expect(result.summary).toBe(
      "Pat's Plumbing: can email invoices on its plan; has a logo.",
    );
    expect(result.data.organization).toMatchObject({
      logo_url: "https://img.clerk.com/a.png",
      plan_features: ["send_email", "stats"],
      your_role: "org:admin",
    });

    mocks.getOrganization.mockResolvedValue({
      id: ORG,
      name: "Pat's Plumbing",
      hasImage: false,
      imageUrl: "https://img.clerk.com/default.png",
    });
    const plain = await getOrganizationTool(ctxWith(["stats"]));
    expect(plain.summary).toBe(
      "Pat's Plumbing: can't email invoices on its plan; no logo yet.",
    );
    expect(plain.data.organization).toMatchObject({
      logo_url: null,
      slug: null,
    });
  });
});

describe("get_stats", () => {
  beforeEach(() => {
    mocks.getOverdueStatsDal.mockResolvedValue({
      data: { count: 2, total: 75 },
      error: null,
    });
  });

  it("adds up the last 12 months", async () => {
    mocks.getStatsDal.mockResolvedValue({
      data: [
        { name: "Oct", revenue: 100, owing: 40, invoices: 2 },
        { name: "Nov", revenue: 50.5, owing: 0, invoices: 1 },
      ],
      error: null,
    });
    const result = await getStatsTool(ctx);
    expect(mocks.getStatsDal).toHaveBeenCalledWith(ctx);
    expect(result.data.totals).toEqual({
      revenue: 150.5,
      owing: 40,
      invoices: 3,
    });
    expect(result.summary).toContain("$150.50 invoiced");
    expect(mocks.getOverdueStatsDal).toHaveBeenCalledWith(ctx);
    expect(result.data.overdue).toEqual({ count: 2, total: 75 });
    expect(result.summary).toContain("Overdue now: 2 invoice(s), $75.00.");
  });

  it("passes errors on", async () => {
    mocks.getStatsDal.mockResolvedValue({
      data: null,
      error: "Missing feature: stats",
    });
    expect((await getStatsTool(ctx)).summary).toBe("Missing feature: stats");
    mocks.getStatsDal.mockResolvedValue({ data: null, error: null });
    expect((await getStatsTool(ctx)).summary).toBe("Couldn't load the stats.");
  });

  it("passes overdue errors on", async () => {
    mocks.getStatsDal.mockResolvedValue({ data: [], error: null });
    mocks.getOverdueStatsDal.mockResolvedValue({
      data: null,
      error: "Failed to fetch overdue stats.",
    });
    expect((await getStatsTool(ctx)).summary).toBe(
      "Failed to fetch overdue stats.",
    );
    mocks.getOverdueStatsDal.mockResolvedValue({ data: null, error: null });
    expect((await getStatsTool(ctx)).summary).toBe("Couldn't load the stats.");
  });
});

describe("manage_logo", () => {
  beforeEach(() => {
    mocks.updateLogo.mockResolvedValue({
      name: "Pat's Plumbing",
      imageUrl: "https://img.clerk.com/new.png",
    });
  });

  it("is for admins only", async () => {
    const result = await manageLogoTool(ctxWith(["stats"], "org:member"), {
      action: "remove",
    });
    expect(result.isError).toBe(true);
    expect(mocks.deleteLogo).not.toHaveBeenCalled();
  });

  it("removes the logo", async () => {
    const result = await manageLogoTool(ctx, { action: "remove" });
    expect(mocks.deleteLogo).toHaveBeenCalledWith(ORG);
    expect(result.data).toEqual({ logo_url: null });
    expect(mocks.revalidateTag).toHaveBeenCalledWith(`invoices-${ORG}`, {
      expire: 0,
    });
  });

  it("uploads base64, with or without a data: prefix", async () => {
    const png = Buffer.from("png-bytes").toString("base64");
    await manageLogoTool(ctx, { action: "set", image_base64: png });
    const [orgId, params] = mocks.updateLogo.mock.calls[0];
    expect(orgId).toBe(ORG);
    expect(params.uploaderUserId).toBe("user_1");
    expect(params.file.type).toBe("image/png");
    expect(Buffer.from(await params.file.arrayBuffer()).toString()).toBe(
      "png-bytes",
    );

    const result = await manageLogoTool(ctx, {
      action: "set",
      image_base64: `data:image/jpeg;base64,${png}`,
      mime_type: "image/jpeg",
    });
    expect(mocks.updateLogo.mock.calls[1][1].file.type).toBe("image/jpeg");
    expect(result.data).toEqual({ logo_url: "https://img.clerk.com/new.png" });
  });

  it("refuses empty, oversized or missing images", async () => {
    expect(
      (await manageLogoTool(ctx, { action: "set", image_base64: "" })).summary,
    ).toBe("To set a logo, pass image_base64 or image_url.");
    expect(
      (await manageLogoTool(ctx, { action: "set", image_base64: "====" }))
        .summary,
    ).toBe("image_base64 is empty.");
    const big = Buffer.alloc(10 * 1024 * 1024 + 1).toString("base64");
    expect(
      (await manageLogoTool(ctx, { action: "set", image_base64: big })).summary,
    ).toBe("The image is over 10 MB.");
    expect(mocks.updateLogo).not.toHaveBeenCalled();
  });

  it("downloads an https image URL", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/webp; charset=binary" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await manageLogoTool(ctx, {
      action: "set",
      image_url: "https://example.test/logo.webp",
    });
    expect(mocks.updateLogo.mock.calls[0][1].file.type).toBe("image/webp");
  });

  it.each([
    ["not a url", undefined, "isn't a valid URL"],
    ["http://example.test/a.png", undefined, "must start with https://"],
    ["https://example.test/a", new Response("x", { status: 404 }), "HTTP 404"],
    [
      "https://example.test/a",
      new Response("<html>", { headers: { "content-type": "text/html" } }),
      "isn't a PNG",
    ],
    [
      "https://example.test/a",
      new Response(new Uint8Array([1])),
      "isn't a PNG",
    ],
    [
      "https://example.test/a",
      new Response(new Uint8Array(10 * 1024 * 1024 + 1), {
        headers: { "content-type": "image/png" },
      }),
      "over 10 MB",
    ],
    ["https://example.test/a", "throw", "Couldn't download the image."],
  ])("refuses image_url %s (%#)", async (url, response, text) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (response === "throw") throw new Error("offline");
        return response as Response;
      }),
    );
    const result = await manageLogoTool(ctx, { action: "set", image_url: url });
    expect(result.summary).toContain(text);
    expect(mocks.updateLogo).not.toHaveBeenCalled();
  });
});

describe("set_invoice_prefix", () => {
  it("saves the prefix and says what the next number is", async () => {
    mocks.updateInvoicePrefixDal.mockResolvedValue(
      ok({ org_id: ORG, invoice_prefix: "ACME", last_invoice_number: 9 }),
    );
    const result = await setInvoicePrefixTool(ctx, { prefix: "ACME" });
    expect(mocks.updateInvoicePrefixDal).toHaveBeenCalledWith("ACME", ctx);
    expect(result.summary).toBe(
      "New invoices are numbered with ACME; the next one is ACME-0010. Invoices already made keep their number.",
    );
    expect(result.data).toEqual({
      invoice_prefix: "ACME",
      next_invoice_number: "ACME-0010",
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith(`org-settings-${ORG}`, {
      expire: 0,
    });
  });

  it("passes on a refusal", async () => {
    mocks.updateInvoicePrefixDal.mockResolvedValue(
      err({ reason: "Admins only" }),
    );
    const result = await setInvoicePrefixTool(
      ctxWith(undefined, "org:member"),
      {
        prefix: "X",
      },
    );
    expect(result.isError).toBe(true);
    expect(result.summary).toBe("Only an organization admin can do that.");
  });
});
