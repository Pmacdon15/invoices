import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  protect: vi.fn(),
  getOrgSettingsDb: vi.fn(),
  updateInvoicePrefixDb: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: mocks.protect } }));
vi.mock("@/db/org-settings", () => ({
  getOrgSettingsDb: mocks.getOrgSettingsDb,
  updateInvoicePrefixDb: mocks.updateInvoicePrefixDb,
}));

import { getOrgSettingsDal, updateInvoicePrefixDal } from "@/dal/org-settings";

const settings = {
  org_id: "org_1",
  invoice_prefix: "ACME",
  last_invoice_number: 3,
};

function signIn(orgId: string | null = "org_1", orgRole = "org:admin") {
  mocks.protect.mockResolvedValue({ orgId, orgRole, has: () => false });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  signIn();
});

describe("getOrgSettingsDal", () => {
  it("needs an organization", async () => {
    signIn(null);
    await expect(getOrgSettingsDal()).resolves.toEqual({
      data: null,
      error: "No org",
    });
  });

  it("returns the org's settings", async () => {
    mocks.getOrgSettingsDb.mockResolvedValue(settings);
    await expect(getOrgSettingsDal()).resolves.toEqual({
      data: settings,
      error: null,
    });
    expect(mocks.getOrgSettingsDb).toHaveBeenCalledWith("org_1");
  });

  it("uses a given context instead of the session", async () => {
    mocks.getOrgSettingsDb.mockResolvedValue(settings);
    await getOrgSettingsDal({ orgId: "org_2", has: () => false });
    expect(mocks.protect).not.toHaveBeenCalled();
    expect(mocks.getOrgSettingsDb).toHaveBeenCalledWith("org_2");
  });

  it("reports a database failure", async () => {
    mocks.getOrgSettingsDb.mockRejectedValue(new Error("down"));
    await expect(getOrgSettingsDal()).resolves.toEqual({
      data: null,
      error: "Failed to fetch settings.",
    });
  });
});

describe("updateInvoicePrefixDal", () => {
  it("needs an organization", async () => {
    signIn(null);
    const result = await updateInvoicePrefixDal("ACME");
    expect(result._unsafeUnwrapErr()).toEqual({ reason: "Not authorized" });
  });

  it("is for admins only", async () => {
    signIn("org_1", "org:member");
    const result = await updateInvoicePrefixDal("ACME");
    expect(result._unsafeUnwrapErr()).toEqual({ reason: "Admins only" });
    expect(mocks.updateInvoicePrefixDb).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "has space",
    "TOO-LONG-PREFIX",
    "INV#",
  ])("rejects the prefix %j", async (prefix) => {
    const result = await updateInvoicePrefixDal(prefix);
    expect(result._unsafeUnwrapErr()).toMatchObject({
      reason: "Validation failed",
    });
    expect(mocks.updateInvoicePrefixDb).not.toHaveBeenCalled();
  });

  it("saves a trimmed prefix", async () => {
    mocks.updateInvoicePrefixDb.mockResolvedValue(settings);
    const result = await updateInvoicePrefixDal("  ACME ");
    expect(result._unsafeUnwrap()).toEqual(settings);
    expect(mocks.updateInvoicePrefixDb).toHaveBeenCalledWith("org_1", "ACME");
  });

  it("reports a database failure", async () => {
    mocks.updateInvoicePrefixDb.mockRejectedValue(new Error("down"));
    const result = await updateInvoicePrefixDal("ACME");
    expect(result._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to update settings",
    });
  });
});
