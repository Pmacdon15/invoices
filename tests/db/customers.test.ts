import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlMock } from "./sql-mock";

const mocks = vi.hoisted(() => ({ neon: vi.fn(), cacheTag: vi.fn() }));

vi.mock("@neondatabase/serverless", () => ({ neon: mocks.neon }));
vi.mock("next/cache", () => ({ cacheTag: mocks.cacheTag }));

import {
  createCustomerDb,
  deleteCustomerDb,
  fetchingCustomersDb,
  getCustomerByIdDb,
  getCustomerCount,
  searchCustomersDb,
  updateCustomerDb,
} from "@/db/customers";

const sql = createSqlMock();

beforeEach(() => {
  sql.reset();
  mocks.neon.mockReturnValue(sql.sql);
  vi.stubEnv("DATABASE_URL", "postgres://test");
});

const customer = {
  id: "c1",
  name: "Ann",
  email: "ann@x.com",
  org_id: "org_1",
  status: "active",
};

describe("fetchingCustomersDb", () => {
  it("returns every non-deleted customer when asked for all", async () => {
    sql.respond(() => [customer, customer]);

    await expect(fetchingCustomersDb("org_1", 4, true)).resolves.toEqual({
      data: [customer, customer],
      currentPage: 1,
      totalPages: 1,
      totalCount: 2,
    });
    expect(mocks.neon).toHaveBeenCalledWith("postgres://test");
    expect(mocks.cacheTag).toHaveBeenCalledWith(
      "customers-org_1",
      "customers-org_1-all",
    );
    const [query] = sql.queries();
    expect(query.text).toContain("status != 'deleted' AND org_id = ?");
    expect(query.values).toEqual(["org_1"]);
  });

  it("pages the org's customers ten at a time", async () => {
    sql.respond(({ text }) =>
      text.startsWith("SELECT COUNT(*)") ? [{ total: "25" }] : [customer],
    );

    await expect(fetchingCustomersDb("org_1", 3)).resolves.toEqual({
      data: [customer],
      currentPage: 3,
      totalPages: 3,
      totalCount: 25,
    });
    expect(mocks.cacheTag).toHaveBeenCalledWith(
      "customers-org_1",
      "customers-org_1-page-3",
    );
    const where = sql.calls.find((c) => c.text.startsWith("WHERE"));
    expect(where?.values).toEqual(["org_1"]);
    const page = sql.queries().find((c) => c.text.includes("LIMIT"));
    expect(page?.values.slice(1)).toEqual([10, 20]);
  });

  it("defaults to the first page", async () => {
    sql.respond(({ text }) =>
      text.startsWith("SELECT COUNT(*)") ? [{ total: "0" }] : [],
    );
    await expect(fetchingCustomersDb("org_1")).resolves.toMatchObject({
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
    });
  });

  it("filters by name or email when given a query", async () => {
    sql.respond(({ text }) =>
      text.startsWith("SELECT COUNT(*)") ? [{ total: "1" }] : [customer],
    );
    await fetchingCustomersDb("org_1", 1, false, "ann");
    const where = sql.calls.find((c) => c.text.startsWith("WHERE"));
    expect(where?.text).toContain("name ILIKE ? OR email ILIKE ?");
    expect(where?.values).toEqual(["org_1", "%ann%", "%ann%"]);
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(fetchingCustomersDb("org_1")).rejects.toThrow("Config Error");
  });
});

describe("searchCustomersDb", () => {
  it("searches the org's customers by name or email", async () => {
    sql.respond(() => [customer]);
    await expect(searchCustomersDb("org_1", "ann")).resolves.toEqual([
      customer,
    ]);
    expect(mocks.cacheTag).toHaveBeenCalledWith("customers-org_1");
    expect(sql.calls[0].values).toEqual(["org_1", "%ann%", "%ann%"]);
    expect(sql.calls[0].text).toContain("LIMIT 10");
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(searchCustomersDb("org_1", "a")).rejects.toThrow(
      "Config Error",
    );
  });
});

describe("createCustomerDb", () => {
  it("inserts the customer into the given org", async () => {
    sql.respond(() => [customer]);
    await expect(
      createCustomerDb(
        { name: "Ann", email: "ann@x.com", status: "active" },
        "org_1",
      ),
    ).resolves.toEqual(customer);
    expect(sql.calls[0].text).toContain("INSERT INTO customers");
    expect(sql.calls[0].values).toEqual([
      "Ann",
      "ann@x.com",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "org_1",
    ]);
  });

  it("saves phone and address, with blanks as NULL", async () => {
    sql.respond(() => [customer]);
    await createCustomerDb(
      {
        name: "Ann",
        email: "ann@x.com",
        phone: " 555-0100 ",
        address_line1: "1 Main St",
        address_line2: "  ",
        city: "Calgary",
        region: "AB",
        postal_code: "T2P 1J9",
        country: "Canada",
        status: "active",
      },
      "org_1",
    );
    expect(sql.calls[0].values).toEqual([
      "Ann",
      "ann@x.com",
      "555-0100",
      "1 Main St",
      null,
      "Calgary",
      "AB",
      "T2P 1J9",
      "Canada",
      "org_1",
    ]);
  });
});

describe("deleteCustomerDb", () => {
  it("soft-deletes the customer scoped to the org", async () => {
    sql.respond(() => [{ ...customer, status: "deleted" }]);
    await expect(deleteCustomerDb("c1", "org_1")).resolves.toMatchObject({
      status: "deleted",
    });
    expect(sql.calls[0].text).toContain("SET status = 'deleted'");
    expect(sql.calls[0].text).toContain("WHERE id = ? AND org_id = ?");
    expect(sql.calls[0].values).toEqual(["c1", "org_1"]);
  });

  it("throws when the customer isn't in the org", async () => {
    await expect(deleteCustomerDb("c1", "org_2")).rejects.toThrow(
      "Customer not found or not authorized",
    );
  });
});

describe("getCustomerCount", () => {
  it("counts the org's active customers", async () => {
    sql.respond(() => [{ count: "7" }]);
    await expect(getCustomerCount("org_1")).resolves.toBe(7);
    expect(sql.calls[0].text).toContain("status = 'active'");
  });

  it("returns 0 when there are no rows", async () => {
    await expect(getCustomerCount("org_1")).resolves.toBe(0);
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getCustomerCount("org_1")).rejects.toThrow("Config Error");
  });
});

describe("updateCustomerDb", () => {
  const input = {
    id: "c1",
    name: "Ann B",
    email: "annb@x.com",
    status: "disabled" as const,
  };

  it("updates name and email only, scoped to the org", async () => {
    sql.respond(() => [{ ...customer, name: "Ann B" }]);
    await expect(updateCustomerDb(input, "org_1")).resolves.toMatchObject({
      name: "Ann B",
    });
    const [query] = sql.calls;
    // The client can't change status; plan limits and deletes own it.
    expect(query.text).toContain(
      "SET name = ?, email = ?, phone = ?, address_line1 = ?, address_line2 = ?, city = ?, region = ?, postal_code = ?, country = ? WHERE",
    );
    expect(query.text).not.toMatch(/status = \?/);
    expect(query.values).toEqual([
      "Ann B",
      "annb@x.com",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "c1",
      "org_1",
    ]);
    expect(query.text).toContain("status != 'deleted'");
  });

  it("throws when the customer isn't in the org", async () => {
    await expect(updateCustomerDb(input, "org_2")).rejects.toThrow(
      "Customer not found or not authorized",
    );
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(updateCustomerDb(input, "org_1")).rejects.toThrow(
      "Config Error",
    );
  });
});

describe("getCustomerByIdDb", () => {
  it("reads one of the org's customers, uncached", async () => {
    sql.respond(() => [customer]);
    await expect(getCustomerByIdDb("c1", "org_1")).resolves.toEqual(customer);
    expect(sql.calls[0].text).toContain("status != 'deleted'");
    expect(sql.calls[0].values).toEqual(["c1", "org_1"]);
  });

  it("returns null when there's no such customer", async () => {
    await expect(getCustomerByIdDb("c1", "org_1")).resolves.toBeNull();
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getCustomerByIdDb("c1", "org_1")).rejects.toThrow(
      "Config Error",
    );
  });
});
