import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  protect: vi.fn(),
  has: vi.fn(),
  createCustomerDb: vi.fn(),
  deleteCustomerDb: vi.fn(),
  fetchingCustomersDb: vi.fn(),
  getCustomerCount: vi.fn(),
  searchCustomersDb: vi.fn(),
  updateCustomerDb: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: mocks.protect },
}));
vi.mock("@/db/customers", () => ({
  createCustomerDb: mocks.createCustomerDb,
  deleteCustomerDb: mocks.deleteCustomerDb,
  fetchingCustomersDb: mocks.fetchingCustomersDb,
  getCustomerCount: mocks.getCustomerCount,
  searchCustomersDb: mocks.searchCustomersDb,
  updateCustomerDb: mocks.updateCustomerDb,
}));

import {
  createCustomerDal,
  deleteCustomerDal,
  getCustomers,
  searchCustomersDal,
  updateCustomerDal,
} from "@/dal/customers";

const ID = "11111111-1111-4111-8111-111111111111";
const input = {
  name: "Ann Smith",
  email: "ann@example.com",
  status: "active" as const,
};

/** Signs the caller in to org_1 with the given plan features. */
function signIn(features: string[] = [], orgId: string | null = "org_1") {
  mocks.has.mockImplementation(({ feature }: { feature: string }) =>
    features.includes(feature),
  );
  mocks.protect.mockResolvedValue({ orgId, has: mocks.has });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  signIn();
});

describe("getCustomers", () => {
  it("returns the org's customers", async () => {
    const page = { data: [], currentPage: 2, totalPages: 3, totalCount: 25 };
    mocks.fetchingCustomersDb.mockResolvedValue(page);

    await expect(getCustomers(2, false, "ann")).resolves.toEqual({
      data: page,
      error: null,
    });
    expect(mocks.fetchingCustomersDb).toHaveBeenCalledWith(
      "org_1",
      2,
      false,
      "ann",
    );
  });

  it("defaults to the first page", async () => {
    mocks.fetchingCustomersDb.mockResolvedValue({});
    await getCustomers();
    expect(mocks.fetchingCustomersDb).toHaveBeenCalledWith(
      "org_1",
      1,
      false,
      undefined,
    );
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    await expect(getCustomers()).resolves.toEqual({
      data: null,
      error: "Not authorized",
    });
    expect(mocks.fetchingCustomersDb).not.toHaveBeenCalled();
  });

  it("reports a database failure", async () => {
    mocks.fetchingCustomersDb.mockRejectedValue(new Error("down"));
    await expect(getCustomers()).resolves.toEqual({
      data: null,
      error: "Database error occurred while fetching customers.",
    });
  });
});

describe("createCustomerDal", () => {
  it("creates the customer in the caller's org", async () => {
    signIn(["create_up_to_4_customers"]);
    mocks.getCustomerCount.mockResolvedValue(3);
    mocks.createCustomerDb.mockResolvedValue({ id: ID, ...input });

    const result = await createCustomerDal(input);

    expect(result._unsafeUnwrap()).toEqual({ id: ID, ...input });
    expect(mocks.createCustomerDb).toHaveBeenCalledWith(input, "org_1");
    expect(mocks.getCustomerCount).toHaveBeenCalledWith("org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    const result = await createCustomerDal(input);
    expect(result._unsafeUnwrapErr()).toEqual({ reason: "Not authorized" });
    expect(mocks.createCustomerDb).not.toHaveBeenCalled();
  });

  it.each([
    ["create_up_to_100_customers", 100],
    ["create_up_to_8_customers", 8],
    ["create_up_to_4_customers", 4],
  ])("enforces the %s plan limit of %i", async (feature, limit) => {
    signIn([feature]);
    mocks.getCustomerCount.mockResolvedValue(limit);

    const result = await createCustomerDal(input);

    expect(result._unsafeUnwrapErr()).toEqual({
      reason: `Usage limit reached, limit: ${limit} customers total with your plan. Consider upgrading`,
    });
    expect(mocks.createCustomerDb).not.toHaveBeenCalled();
  });

  it("uses the best plan when the caller has several", async () => {
    signIn(["create_up_to_4_customers", "create_up_to_100_customers"]);
    mocks.getCustomerCount.mockResolvedValue(50);
    mocks.createCustomerDb.mockResolvedValue({ id: ID });

    expect((await createCustomerDal(input)).isOk()).toBe(true);
  });

  it("allows nothing without a plan", async () => {
    mocks.getCustomerCount.mockResolvedValue(0);
    const result = await createCustomerDal(input);
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Usage limit reached, limit: 0 customers total with your plan. Consider upgrading",
    );
  });

  it("reads plan slugs and limits from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PRO_CUSTOMERS_SLUG", "pro");
    vi.stubEnv("NEXT_PUBLIC_CLERK_BASIC_CUSTOMERS_SLUG", "basic");
    vi.stubEnv("NEXT_PUBLIC_CLERK_FREE_CUSTOMERS_SLUG", "free");
    vi.stubEnv("NEXT_PUBLIC_PRO_LIMIT", "7");
    vi.stubEnv("NEXT_PUBLIC_BASIC_CUSTOMER_LIMIT", "3");
    vi.stubEnv("NEXT_PUBLIC_FREE_CUSTOMER_LIMIT", "1");
    mocks.getCustomerCount.mockResolvedValue(1);

    for (const [feature, limit, ok] of [
      ["pro", 7, true],
      ["basic", 3, true],
      ["free", 1, false],
    ] as const) {
      signIn([feature]);
      mocks.createCustomerDb.mockResolvedValue({ id: ID });
      const result = await createCustomerDal(input);
      expect(result.isOk(), `${feature} (${limit})`).toBe(ok);
    }
  });

  it("fails closed when the usage count can't be read", async () => {
    signIn(["create_up_to_100_customers"]);
    mocks.getCustomerCount.mockRejectedValue(new Error("down"));

    const result = await createCustomerDal(input);

    expect(result._unsafeUnwrapErr()).toEqual({
      reason: "Failed to verify limits",
    });
    expect(mocks.createCustomerDb).not.toHaveBeenCalled();
  });

  it("rejects invalid input with a field error tree", async () => {
    signIn(["create_up_to_100_customers"]);
    mocks.getCustomerCount.mockResolvedValue(0);

    const result = await createCustomerDal({
      ...input,
      name: "A",
      email: "not-an-email",
    });

    const error = result._unsafeUnwrapErr();
    expect(error.reason).toBe("Validation failed");
    const errors = (
      error as { errors: { properties: Record<string, unknown> } }
    ).errors.properties;
    expect(errors.name).toEqual({
      errors: ["Name must be at least 2 characters"],
    });
    expect(errors.email).toEqual({ errors: ["Invalid email address"] });
    expect(mocks.createCustomerDb).not.toHaveBeenCalled();
  });

  it("reports a failed insert", async () => {
    signIn(["create_up_to_100_customers"]);
    mocks.getCustomerCount.mockResolvedValue(0);
    mocks.createCustomerDb.mockRejectedValue(new Error("dup"));

    const result = await createCustomerDal(input);
    expect(result._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to create customer",
    });
  });
});

describe("deleteCustomerDal", () => {
  it("deletes the customer within the caller's org", async () => {
    mocks.deleteCustomerDb.mockResolvedValue({ id: ID, status: "deleted" });
    const result = await deleteCustomerDal(ID);
    expect(result._unsafeUnwrap()).toEqual({ id: ID, status: "deleted" });
    expect(mocks.deleteCustomerDb).toHaveBeenCalledWith(ID, "org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    expect((await deleteCustomerDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
  });

  it("rejects an id that isn't a UUID", async () => {
    const result = await deleteCustomerDal("1; DROP TABLE customers");
    expect(result._unsafeUnwrapErr().reason).toBe("Validation failed");
    expect(mocks.deleteCustomerDb).not.toHaveBeenCalled();
  });

  it("reports a failed delete", async () => {
    mocks.deleteCustomerDb.mockRejectedValue(new Error("not found"));
    expect((await deleteCustomerDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to delete customer",
    });
  });
});

describe("searchCustomersDal", () => {
  it("searches within the caller's org", async () => {
    mocks.searchCustomersDb.mockResolvedValue([{ id: ID }]);
    await expect(searchCustomersDal("ann")).resolves.toEqual({
      data: [{ id: ID }],
      error: null,
    });
    expect(mocks.searchCustomersDb).toHaveBeenCalledWith("org_1", "ann");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    await expect(searchCustomersDal("ann")).resolves.toEqual({
      data: null,
      error: "No org",
    });
  });

  it("reports a database failure", async () => {
    mocks.searchCustomersDb.mockRejectedValue(new Error("down"));
    await expect(searchCustomersDal("ann")).resolves.toEqual({
      data: null,
      error: "Database error occurred.",
    });
  });
});

describe("updateCustomerDal", () => {
  const update = { ...input, id: ID };

  it("updates with the validated data in the caller's org", async () => {
    mocks.updateCustomerDb.mockResolvedValue(update);
    const result = await updateCustomerDal({
      ...update,
      extra: "dropped",
    } as never);
    expect(result._unsafeUnwrap()).toEqual(update);
    expect(mocks.updateCustomerDb).toHaveBeenCalledWith(update, "org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    expect((await updateCustomerDal(update))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
  });

  it("rejects invalid input", async () => {
    const result = await updateCustomerDal({ ...update, id: "nope" });
    expect(result._unsafeUnwrapErr().reason).toBe("Validation failed");
    expect(mocks.updateCustomerDb).not.toHaveBeenCalled();
  });

  it("reports a failed update", async () => {
    mocks.updateCustomerDb.mockRejectedValue(new Error("not found"));
    expect((await updateCustomerDal(update))._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to update customer",
    });
  });
});
