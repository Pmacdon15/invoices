import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlMock } from "./sql-mock";

const mocks = vi.hoisted(() => ({
  neon: vi.fn(),
  revalidateTag: vi.fn(),
  clerkClient: vi.fn(),
  getSubscription: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({ neon: mocks.neon }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: mocks.clerkClient }));

import { deleteOrgData, getAllOrgIds, rebalanceOrgItems } from "@/db/utils";

const sql = createSqlMock();

const rows = (n: number, status = "active") =>
  Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, status }));

/** Subscription whose plan has features with these names. */
const subscription = (...names: (string | undefined)[]) => ({
  subscriptionItems: [
    { plan: { features: names.map((name, i) => ({ id: `f${i}`, name })) } },
  ],
});

/** Answers the customer/product SELECTs and records the status UPDATEs. */
function seed(customers: { id: string; status: string }[], products = rows(0)) {
  sql.respond(({ text }) => {
    if (text.startsWith("SELECT id, status FROM customers")) return customers;
    if (text.startsWith("SELECT id, status FROM products")) return products;
    return undefined;
  });
}

const updates = (table: string) =>
  sql.calls
    .filter((c) => c.text.startsWith(`UPDATE ${table}`))
    .map((c) => c.values);

beforeEach(() => {
  sql.reset();
  mocks.neon.mockReturnValue(sql.sql);
  vi.stubEnv("DATABASE_URL", "postgres://test");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.clerkClient.mockResolvedValue({
    billing: { getOrganizationBillingSubscription: mocks.getSubscription },
  });
  mocks.getSubscription.mockResolvedValue(null);
});

describe("rebalanceOrgItems", () => {
  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(rebalanceOrgItems("org_1")).rejects.toThrow("Config Error");
  });

  it("looks up the subscription with a trimmed org id", async () => {
    seed([]);
    await rebalanceOrgItems("  org_1 \n");
    expect(mocks.getSubscription).toHaveBeenCalledWith("org_1");
  });

  it("keeps free limits (4 customers, 5 products) with no subscription", async () => {
    seed(rows(6), rows(7));

    await rebalanceOrgItems("org_1");

    expect(updates("customers")).toEqual([
      ["disabled", "id-4"],
      ["disabled", "id-5"],
    ]);
    expect(updates("products")).toEqual([
      ["disabled", "id-5"],
      ["disabled", "id-6"],
    ]);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("customers-org_1", {
      expire: 0,
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("products-org_1", {
      expire: 0,
    });
  });

  it("only touches rows whose status changes, and scopes reads to the org", async () => {
    seed(
      [
        { id: "a", status: "disabled" },
        { id: "b", status: "active" },
      ],
      [{ id: "p", status: "active" }],
    );

    await rebalanceOrgItems("org_1");

    expect(updates("customers")).toEqual([["active", "a"]]);
    expect(updates("products")).toEqual([]);
    const selects = sql.calls.filter((c) => c.text.startsWith("SELECT"));
    for (const select of selects) {
      expect(select.text).toContain("status != 'deleted'");
      expect(select.values).toEqual(["org_1"]);
    }
  });

  it("leaves the cache alone when nothing changes", async () => {
    seed(rows(2), rows(2));
    await rebalanceOrgItems("org_1");
    expect(updates("customers")).toEqual([]);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("re-enables everything on the pro plan", async () => {
    mocks.getSubscription.mockResolvedValue(
      subscription("Create up to 100 customers", "Create up to 100 products"),
    );
    seed(rows(10, "disabled"), rows(1, "disabled"));

    await rebalanceOrgItems("org_1");

    expect(updates("customers")).toHaveLength(10);
    expect(updates("customers").every(([s]) => s === "active")).toBe(true);
    expect(updates("products")).toEqual([["active", "id-0"]]);
  });

  it("applies the basic plan's limits (8 customers, 10 products)", async () => {
    mocks.getSubscription.mockResolvedValue(
      subscription("create up to 8   customers", "Create Up To 10 Products"),
    );
    seed(rows(9), rows(11));

    await rebalanceOrgItems("org_1");

    expect(updates("customers")).toEqual([["disabled", "id-8"]]);
    expect(updates("products")).toEqual([["disabled", "id-10"]]);
  });

  it("recognises the free plan's features by name", async () => {
    mocks.getSubscription.mockResolvedValue(
      subscription("Create up to 4 customers", "Create up to 5 products"),
    );
    seed(rows(5), rows(6));

    await rebalanceOrgItems("org_1");

    expect(updates("customers")).toEqual([["disabled", "id-4"]]);
    expect(updates("products")).toEqual([["disabled", "id-5"]]);
  });

  it("uses free limits when features match no plan or have no name", async () => {
    mocks.getSubscription.mockResolvedValue(subscription("Stats", undefined));
    seed(rows(5), rows(6));

    await rebalanceOrgItems("org_1");

    expect(updates("customers")).toEqual([["disabled", "id-4"]]);
    expect(updates("products")).toEqual([["disabled", "id-5"]]);
  });

  it("uses free limits for a subscription without features", async () => {
    mocks.getSubscription.mockResolvedValue({
      subscriptionItems: [{ plan: null }, { plan: { features: [] } }],
    });
    seed(rows(5));
    await rebalanceOrgItems("org_1");
    expect(updates("customers")).toEqual([["disabled", "id-4"]]);
  });

  it("reads plan names and limits from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PRO_CUSTOMERS_SLUG", "pro_c");
    vi.stubEnv("NEXT_PUBLIC_CLERK_BASIC_PRODUCTS_SLUG", "basic_p");
    vi.stubEnv("NEXT_PUBLIC_PRO_LIMIT", "2");
    vi.stubEnv("NEXT_PUBLIC_BASIC_PRODUCT_LIMIT", "1");
    vi.stubEnv("NEXT_PUBLIC_CLERK_BASIC_CUSTOMERS_SLUG", "b");
    vi.stubEnv("NEXT_PUBLIC_CLERK_FREE_CUSTOMERS_SLUG", "f");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PRO_PRODUCTS_SLUG", "p");
    vi.stubEnv("NEXT_PUBLIC_CLERK_FREE_PRODUCTS_SLUG", "fp");
    vi.stubEnv("NEXT_PUBLIC_BASIC_CUSTOMER_LIMIT", "1");
    vi.stubEnv("NEXT_PUBLIC_FREE_CUSTOMER_LIMIT", "1");
    vi.stubEnv("NEXT_PUBLIC_FREE_PRODUCT_LIMIT", "1");
    mocks.getSubscription.mockResolvedValue(subscription("Pro C", "Basic P"));
    seed(rows(3), rows(2));

    await rebalanceOrgItems("org_1");

    expect(updates("customers")).toEqual([["disabled", "id-2"]]);
    expect(updates("products")).toEqual([["disabled", "id-1"]]);
  });

  it.each([
    ["a 404 (no subscription)", { status: 404, message: "Not found" }],
    ["any other Clerk error", { status: 500, message: "boom" }],
  ])("falls back to free limits on %s", async (_label, error) => {
    mocks.getSubscription.mockRejectedValue(error);
    seed(rows(5));

    await rebalanceOrgItems("org_1");

    expect(updates("customers")).toEqual([["disabled", "id-4"]]);
  });
});

describe("deleteOrgData", () => {
  it("deletes the org's invoices, products, customers and settings", async () => {
    await deleteOrgData("org_1");
    expect(sql.calls.map((c) => [c.text, c.values])).toEqual([
      ["DELETE FROM invoices WHERE org_id = ?", ["org_1"]],
      ["DELETE FROM products WHERE org_id = ?", ["org_1"]],
      ["DELETE FROM customers WHERE org_id = ?", ["org_1"]],
      ["DELETE FROM org_settings WHERE org_id = ?", ["org_1"]],
    ]);
  });

  it("rethrows a database failure", async () => {
    sql.respond(() => new Error("fk violation"));
    await expect(deleteOrgData("org_1")).rejects.toThrow("fk violation");
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(deleteOrgData("org_1")).rejects.toThrow("Config Error");
  });
});

describe("getAllOrgIds", () => {
  it("returns every org that has customers or products", async () => {
    sql.respond(() => [{ org_id: "org_1" }, { org_id: "org_2" }]);
    await expect(getAllOrgIds()).resolves.toEqual([
      { org_id: "org_1" },
      { org_id: "org_2" },
    ]);
    expect(sql.calls[0].text).toContain("UNION");
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getAllOrgIds()).rejects.toThrow("Config Error");
  });
});
