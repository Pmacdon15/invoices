import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  protect: vi.fn(),
  clerkClient: vi.fn(),
  getOrganization: vi.fn(),
  getOrganizationMembershipList: vi.fn(),
  getUser: vi.fn(),
  isOverMemberShipLimit: vi.fn(),
  createInvoiceDb: vi.fn(),
  deleteInvoiceDb: vi.fn(),
  fetchingInvoiceByIdDb: vi.fn(),
  fetchingInvoicesDb: vi.fn(),
  getMonthlyInvoiceCount: vi.fn(),
  searchInvoicesDb: vi.fn(),
  sendInvoiceDb: vi.fn(),
  updateInvoiceDb: vi.fn(),
  updateInvoiceStatusDb: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: mocks.protect },
  clerkClient: mocks.clerkClient,
}));
vi.mock("@/db/clerk", () => ({
  isOverMemberShipLimit: mocks.isOverMemberShipLimit,
}));
vi.mock("@/db/invoices", () => ({
  createInvoiceDb: mocks.createInvoiceDb,
  deleteInvoiceDb: mocks.deleteInvoiceDb,
  fetchingInvoiceByIdDb: mocks.fetchingInvoiceByIdDb,
  fetchingInvoicesDb: mocks.fetchingInvoicesDb,
  getMonthlyInvoiceCount: mocks.getMonthlyInvoiceCount,
  searchInvoicesDb: mocks.searchInvoicesDb,
  sendInvoiceDb: mocks.sendInvoiceDb,
  updateInvoiceDb: mocks.updateInvoiceDb,
  updateInvoiceStatusDb: mocks.updateInvoiceStatusDb,
}));

import {
  createInvoiceDal,
  deleteInvoiceDal,
  getInvoiceById,
  getInvoices,
  searchInvoicesDal,
  sendInvoiceDal,
  updateInvoiceDal,
  updateInvoiceStatusDal,
} from "@/dal/invoices";

const ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const PRODUCT = "33333333-3333-4333-8333-333333333333";

const input = {
  customer_id: CUSTOMER,
  status: "draft" as const,
  tax_rate: 5,
  items: [{ product_id: PRODUCT, quantity: 2, unit_price: 10 }],
};

function signIn(features: string[] = [], orgId: string | null = "org_1") {
  mocks.protect.mockResolvedValue({
    orgId,
    has: ({ feature }: { feature: string }) => features.includes(feature),
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  signIn();
  mocks.isOverMemberShipLimit.mockResolvedValue(false);
  mocks.getMonthlyInvoiceCount.mockResolvedValue(0);
  mocks.clerkClient.mockResolvedValue({
    organizations: {
      getOrganization: mocks.getOrganization,
      getOrganizationMembershipList: mocks.getOrganizationMembershipList,
    },
    users: { getUser: mocks.getUser },
  });
});

describe("getInvoices", () => {
  it("returns the org's invoices page", async () => {
    mocks.fetchingInvoicesDb.mockResolvedValue({ data: [] });
    await expect(getInvoices(3, "acme")).resolves.toEqual({
      data: { data: [] },
      error: null,
    });
    expect(mocks.fetchingInvoicesDb).toHaveBeenCalledWith("org_1", 3, "acme");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    await expect(getInvoices(1)).resolves.toEqual({
      data: null,
      error: "No org",
    });
  });

  it("reports a database failure", async () => {
    mocks.fetchingInvoicesDb.mockRejectedValue(new Error("down"));
    await expect(getInvoices(1)).resolves.toEqual({
      data: null,
      error: "Database error occurred.",
    });
  });
});

describe("getInvoiceById", () => {
  it("returns the invoice from the caller's org", async () => {
    mocks.fetchingInvoiceByIdDb.mockResolvedValue({ id: ID });
    await expect(getInvoiceById(ID)).resolves.toEqual({
      data: { id: ID },
      error: null,
    });
    expect(mocks.fetchingInvoiceByIdDb).toHaveBeenCalledWith(ID, "org_1");
  });

  it("says when the invoice doesn't exist (or belongs to another org)", async () => {
    mocks.fetchingInvoiceByIdDb.mockResolvedValue(null);
    await expect(getInvoiceById(ID)).resolves.toEqual({
      data: null,
      error: "Invoice not found",
    });
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    await expect(getInvoiceById(ID)).resolves.toEqual({
      data: null,
      error: "No org",
    });
  });

  it("reports a database failure", async () => {
    mocks.fetchingInvoiceByIdDb.mockRejectedValue(new Error("down"));
    await expect(getInvoiceById(ID)).resolves.toEqual({
      data: null,
      error: "Failed to fetch invoice.",
    });
  });
});

describe("createInvoiceDal", () => {
  it("creates the invoice with the validated data", async () => {
    signIn(["create_up_to_5_invoices_a_month"]);
    mocks.getMonthlyInvoiceCount.mockResolvedValue(4);
    mocks.createInvoiceDb.mockResolvedValue({ id: ID });

    const result = await createInvoiceDal({
      ...input,
      items: [{ product_id: PRODUCT, quantity: "2", unit_price: "10" }],
    } as never);

    expect(result._unsafeUnwrap()).toEqual({ id: ID });
    expect(mocks.createInvoiceDb).toHaveBeenCalledWith(input, "org_1");
    expect(mocks.isOverMemberShipLimit).toHaveBeenCalledWith("org_1");
    expect(mocks.getMonthlyInvoiceCount).toHaveBeenCalledWith("org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    expect((await createInvoiceDal(input))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
  });

  it.each([
    ["create_up_to_100_invoices_a_month", 100],
    ["create_up_to_10_invoices_a_month", 10],
    ["create_up_to_5_invoices_a_month", 5],
  ])("enforces the %s monthly limit of %i", async (feature, limit) => {
    signIn([feature]);
    mocks.getMonthlyInvoiceCount.mockResolvedValue(limit);

    expect((await createInvoiceDal(input))._unsafeUnwrapErr()).toEqual({
      reason: `Usage limit reached, limit: ${limit} a month with your plan. Consider upgrading.`,
    });
    expect(mocks.createInvoiceDb).not.toHaveBeenCalled();
  });

  it("allows nothing without a plan", async () => {
    expect((await createInvoiceDal(input))._unsafeUnwrapErr().reason).toBe(
      "Usage limit reached, limit: 0 a month with your plan. Consider upgrading.",
    );
  });

  it("reads plan slugs and limits from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PRO_INVOICES_SLUG", "pro");
    vi.stubEnv("NEXT_PUBLIC_CLERK_BASIC_INVOICES_SLUG", "basic");
    vi.stubEnv("NEXT_PUBLIC_CLERK_FREE_INVOICES_SLUG", "free");
    vi.stubEnv("NEXT_PUBLIC_PRO_LIMIT", "7");
    vi.stubEnv("NEXT_PUBLIC_BASIC_INVOICE_LIMIT", "3");
    vi.stubEnv("NEXT_PUBLIC_FREE_INVOICE_LIMIT", "1");
    mocks.getMonthlyInvoiceCount.mockResolvedValue(1);
    mocks.createInvoiceDb.mockResolvedValue({ id: ID });

    for (const [feature, ok] of [
      ["pro", true],
      ["basic", true],
      ["free", false],
    ] as const) {
      signIn([feature]);
      expect((await createInvoiceDal(input)).isOk(), feature).toBe(ok);
    }
  });

  it("refuses an org over its membership limit", async () => {
    signIn(["create_up_to_100_invoices_a_month"]);
    mocks.isOverMemberShipLimit.mockResolvedValue(true);

    expect((await createInvoiceDal(input))._unsafeUnwrapErr()).toEqual({
      reason: "Over organization membership limit",
    });
    expect(mocks.createInvoiceDb).not.toHaveBeenCalled();
  });

  it("fails closed when limits can't be checked", async () => {
    signIn(["create_up_to_100_invoices_a_month"]);
    mocks.getMonthlyInvoiceCount.mockRejectedValue(new Error("down"));

    expect((await createInvoiceDal(input))._unsafeUnwrapErr()).toEqual({
      reason: "Failed to verify limits",
    });
  });

  it("rejects an invoice with no items", async () => {
    signIn(["create_up_to_100_invoices_a_month"]);
    const result = await createInvoiceDal({ ...input, items: [] });
    const error = result._unsafeUnwrapErr() as {
      reason: string;
      errors: { properties: { items: { errors: string[] } } };
    };
    expect(error.reason).toBe("Validation failed");
    expect(error.errors.properties.items.errors).toEqual([
      "Invoice must have at least one item",
    ]);
    expect(mocks.createInvoiceDb).not.toHaveBeenCalled();
  });

  it.each([
    "Customer not found or is disabled",
    "One or more products are not found or are disabled",
  ])("passes on the %s error", async (message) => {
    signIn(["create_up_to_100_invoices_a_month"]);
    mocks.createInvoiceDb.mockRejectedValue(new Error(message));
    expect((await createInvoiceDal(input))._unsafeUnwrapErr()).toEqual({
      reason: message,
    });
  });

  it.each([
    ["an Error", new Error("boom")],
    ["a non-Error", "boom"],
  ])("reports other insert failures (%s)", async (_label, thrown) => {
    signIn(["create_up_to_100_invoices_a_month"]);
    mocks.createInvoiceDb.mockRejectedValue(thrown);
    expect((await createInvoiceDal(input))._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to create invoice",
    });
  });
});

describe("deleteInvoiceDal", () => {
  it("deletes the invoice within the caller's org", async () => {
    mocks.deleteInvoiceDb.mockResolvedValue({ id: ID });
    expect((await deleteInvoiceDal(ID))._unsafeUnwrap()).toEqual({ id: ID });
    expect(mocks.deleteInvoiceDb).toHaveBeenCalledWith(ID, "org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    expect((await deleteInvoiceDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
  });

  it("rejects an id that isn't a UUID", async () => {
    expect((await deleteInvoiceDal("x"))._unsafeUnwrapErr().reason).toBe(
      "Validation failed",
    );
    expect(mocks.deleteInvoiceDb).not.toHaveBeenCalled();
  });

  it("reports a failed delete", async () => {
    mocks.deleteInvoiceDb.mockRejectedValue(new Error("nope"));
    expect((await deleteInvoiceDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to delete invoice",
    });
  });
});

describe("updateInvoiceStatusDal", () => {
  it("updates the status within the caller's org", async () => {
    mocks.updateInvoiceStatusDb.mockResolvedValue({ id: ID, status: "paid" });
    const result = await updateInvoiceStatusDal(ID, "paid");
    expect(result._unsafeUnwrap()).toEqual({ id: ID, status: "paid" });
    expect(mocks.updateInvoiceStatusDb).toHaveBeenCalledWith(
      ID,
      "paid",
      "org_1",
    );
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    expect(
      (await updateInvoiceStatusDal(ID, "paid"))._unsafeUnwrapErr(),
    ).toEqual({ reason: "Not authorized" });
  });

  it("rejects an unknown status", async () => {
    const result = await updateInvoiceStatusDal(ID, "void" as "paid");
    expect(result._unsafeUnwrapErr().reason).toBe("Validation failed");
    expect(mocks.updateInvoiceStatusDb).not.toHaveBeenCalled();
  });

  it("reports a failed update", async () => {
    mocks.updateInvoiceStatusDb.mockRejectedValue(new Error("nope"));
    expect(
      (await updateInvoiceStatusDal(ID, "sent"))._unsafeUnwrapErr(),
    ).toEqual({ reason: "Db failed to update invoice" });
  });
});

describe("sendInvoiceDal", () => {
  beforeEach(() => {
    signIn(["send_email"]);
    mocks.getOrganization.mockResolvedValue({
      name: "Acme",
      imageUrl: "https://img/acme.png",
    });
    mocks.getOrganizationMembershipList.mockResolvedValue({
      data: [
        { role: "org:member", publicUserData: { userId: "user_member" } },
        { role: "org:admin", publicUserData: { userId: "user_admin" } },
      ],
    });
    mocks.getUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "admin@acme.com" }],
    });
    mocks.sendInvoiceDb.mockResolvedValue({ id: ID, status: "sent" });
  });

  it("sends with the org's name, logo and first admin's email", async () => {
    const result = await sendInvoiceDal(ID);

    expect(result._unsafeUnwrap()).toEqual({ id: ID, status: "sent" });
    expect(mocks.getOrganization).toHaveBeenCalledWith({
      organizationId: "org_1",
    });
    expect(mocks.getUser).toHaveBeenCalledWith("user_admin");
    expect(mocks.sendInvoiceDb).toHaveBeenCalledWith(
      ID,
      "org_1",
      "Acme",
      "https://img/acme.png",
      "admin@acme.com",
    );
  });

  it("sends without an admin email when there is no admin", async () => {
    mocks.getOrganizationMembershipList.mockResolvedValue({
      data: [{ role: "org:admin", publicUserData: null }],
    });
    await sendInvoiceDal(ID);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.sendInvoiceDb).toHaveBeenCalledWith(
      ID,
      "org_1",
      "Acme",
      "https://img/acme.png",
      undefined,
    );
  });

  it("sends without an admin email when the admin has none", async () => {
    mocks.getUser.mockResolvedValue({ emailAddresses: [] });
    await sendInvoiceDal(ID);
    expect(mocks.sendInvoiceDb.mock.calls[0][4]).toBeUndefined();
  });

  it("refuses a plan without the send_email feature", async () => {
    signIn([]);
    expect((await sendInvoiceDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
    expect(mocks.sendInvoiceDb).not.toHaveBeenCalled();
  });

  it("refuses a caller with no org", async () => {
    signIn(["send_email"], null);
    expect((await sendInvoiceDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
  });

  it("rejects an id that isn't a UUID", async () => {
    expect((await sendInvoiceDal("x"))._unsafeUnwrapErr().reason).toBe(
      "Validation failed",
    );
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it.each([
    ["an Error", new Error("clerk down"), "clerk down"],
    ["a non-Error", "clerk down", "Unknown error"],
  ])("reports a failed Clerk lookup (%s)", async (_l, thrown, message) => {
    mocks.getOrganization.mockRejectedValue(thrown);
    expect((await sendInvoiceDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Failed to send invoice",
      message,
    });
    expect(mocks.sendInvoiceDb).not.toHaveBeenCalled();
  });

  it.each([
    ["an Error", new Error("SES down"), "SES down"],
    ["a non-Error", 42, "Unknown error"],
  ])("reports a failed send (%s)", async (_l, thrown, message) => {
    mocks.sendInvoiceDb.mockRejectedValue(thrown);
    expect((await sendInvoiceDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Failed to send invoice",
      message,
    });
  });
});

describe("searchInvoicesDal", () => {
  it("searches within the caller's org", async () => {
    mocks.searchInvoicesDb.mockResolvedValue([{ id: ID }]);
    await expect(searchInvoicesDal("acme")).resolves.toEqual({
      data: [{ id: ID }],
      error: null,
    });
    expect(mocks.searchInvoicesDb).toHaveBeenCalledWith("org_1", "acme");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    await expect(searchInvoicesDal("acme")).resolves.toEqual({
      data: null,
      error: "No org",
    });
  });

  it("reports a database failure", async () => {
    mocks.searchInvoicesDb.mockRejectedValue(new Error("down"));
    await expect(searchInvoicesDal("acme")).resolves.toEqual({
      data: null,
      error: "Database error occurred.",
    });
  });
});

describe("updateInvoiceDal", () => {
  const update = { ...input, id: ID };

  it("updates with the validated data in the caller's org", async () => {
    mocks.updateInvoiceDb.mockResolvedValue({ id: ID });
    expect((await updateInvoiceDal(update))._unsafeUnwrap()).toEqual({
      id: ID,
    });
    expect(mocks.updateInvoiceDb).toHaveBeenCalledWith(update, "org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    expect((await updateInvoiceDal(update))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
  });

  it("rejects a tax rate over 100%", async () => {
    const result = await updateInvoiceDal({ ...update, tax_rate: 101 });
    expect(result._unsafeUnwrapErr().reason).toBe("Validation failed");
    expect(mocks.updateInvoiceDb).not.toHaveBeenCalled();
  });

  it.each([
    "Customer not found or is disabled",
    "One or more products are not found or are disabled",
  ])("passes on the %s error", async (message) => {
    mocks.updateInvoiceDb.mockRejectedValue(new Error(message));
    expect((await updateInvoiceDal(update))._unsafeUnwrapErr()).toEqual({
      reason: message,
    });
  });

  it.each([
    ["an Error", new Error("Invoice not found or not authorized")],
    ["a non-Error", null],
  ])("reports other update failures (%s)", async (_l, thrown) => {
    mocks.updateInvoiceDb.mockRejectedValue(thrown);
    expect((await updateInvoiceDal(update))._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to update invoice",
    });
  });
});
