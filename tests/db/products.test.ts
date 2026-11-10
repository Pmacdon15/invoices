import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlMock } from "./sql-mock";

const mocks = vi.hoisted(() => ({ neon: vi.fn(), cacheTag: vi.fn() }));

vi.mock("@neondatabase/serverless", () => ({ neon: mocks.neon }));
vi.mock("next/cache", () => ({ cacheTag: mocks.cacheTag }));

import {
  createProductDb,
  deleteProductDb,
  fetchingProductsDb,
  getProductByIdDb,
  getProductCount,
  searchProductsDb,
  updateProductDb,
} from "@/db/products";

const sql = createSqlMock();

beforeEach(() => {
  sql.reset();
  mocks.neon.mockReturnValue(sql.sql);
  vi.stubEnv("DATABASE_URL", "postgres://test");
});

const product = {
  id: "p1",
  name: "Widget",
  price: 5,
  org_id: "org_1",
  status: "active",
};

describe("fetchingProductsDb", () => {
  it("returns every non-deleted product when asked for all", async () => {
    sql.respond(() => [product]);
    await expect(fetchingProductsDb("org_1", 2, true)).resolves.toEqual({
      data: [product],
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
    });
    expect(mocks.cacheTag).toHaveBeenCalledWith(
      "products-org_1",
      "products-org_1-all",
    );
    expect(sql.calls[0].text).toContain("status != 'deleted' AND org_id = ?");
  });

  it("pages the org's products ten at a time", async () => {
    sql.respond(({ text }) =>
      text.startsWith("SELECT COUNT(*)") ? [{ total: "11" }] : [product],
    );
    await expect(fetchingProductsDb("org_1", 2)).resolves.toEqual({
      data: [product],
      currentPage: 2,
      totalPages: 2,
      totalCount: 11,
    });
    expect(mocks.cacheTag).toHaveBeenCalledWith(
      "products-org_1",
      "products-org_1-page-2",
    );
    const page = sql.queries().find((c) => c.text.includes("LIMIT"));
    expect(page?.values.slice(1)).toEqual([10, 10]);
  });

  it("defaults to the first page", async () => {
    sql.respond(({ text }) =>
      text.startsWith("SELECT COUNT(*)") ? [{ total: "0" }] : [],
    );
    await expect(fetchingProductsDb("org_1")).resolves.toMatchObject({
      currentPage: 1,
      totalCount: 0,
    });
  });

  it("filters by name when given a query", async () => {
    sql.respond(({ text }) =>
      text.startsWith("SELECT COUNT(*)") ? [{ total: "1" }] : [product],
    );
    await fetchingProductsDb("org_1", 1, false, "wid");
    const where = sql.calls.find((c) => c.text.startsWith("WHERE"));
    expect(where?.text).toContain("name ILIKE ?");
    expect(where?.values).toEqual(["org_1", "%wid%"]);
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(fetchingProductsDb("org_1")).rejects.toThrow("Config Error");
  });
});

describe("createProductDb", () => {
  it("inserts the product into the given org", async () => {
    sql.respond(() => [product]);
    await expect(
      createProductDb({ name: "Widget", price: 5, status: "active" }, "org_1"),
    ).resolves.toEqual(product);
    expect(sql.calls[0].values).toEqual(["Widget", 5, "org_1"]);
  });
});

describe("deleteProductDb", () => {
  it("soft-deletes the product scoped to the org", async () => {
    sql.respond(() => [{ ...product, status: "deleted" }]);
    await expect(deleteProductDb("p1", "org_1")).resolves.toMatchObject({
      status: "deleted",
    });
    expect(sql.calls[0].text).toContain("WHERE id = ? AND org_id = ?");
    expect(sql.calls[0].values).toEqual(["p1", "org_1"]);
  });

  it("throws when the product isn't in the org", async () => {
    await expect(deleteProductDb("p1", "org_2")).rejects.toThrow(
      "Product id not found or not authorized",
    );
  });
});

describe("searchProductsDb", () => {
  it("searches the org's products by name", async () => {
    sql.respond(() => [product]);
    await expect(searchProductsDb("org_1", "wid")).resolves.toEqual([product]);
    expect(mocks.cacheTag).toHaveBeenCalledWith("products-org_1");
    expect(sql.calls[0].values).toEqual(["org_1", "%wid%"]);
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(searchProductsDb("org_1", "w")).rejects.toThrow(
      "Config Error",
    );
  });
});

describe("getProductCount", () => {
  it("counts the org's active products", async () => {
    sql.respond(() => [{ count: "3" }]);
    await expect(getProductCount("org_1")).resolves.toBe(3);
  });

  it("returns 0 when there are no rows", async () => {
    await expect(getProductCount("org_1")).resolves.toBe(0);
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getProductCount("org_1")).rejects.toThrow("Config Error");
  });
});

describe("updateProductDb", () => {
  const input = {
    id: "p1",
    name: "Gadget",
    price: 9,
    status: "disabled" as const,
  };

  it("updates name and price only, scoped to the org", async () => {
    sql.respond(() => [{ ...product, name: "Gadget" }]);
    await expect(updateProductDb(input, "org_1")).resolves.toMatchObject({
      name: "Gadget",
    });
    expect(sql.calls[0].text).toContain("SET name = ?, price = ? WHERE");
    expect(sql.calls[0].text).not.toMatch(/status = \?/);
    expect(sql.calls[0].values).toEqual(["Gadget", 9, "p1", "org_1"]);
  });

  it("throws when the product isn't in the org", async () => {
    await expect(updateProductDb(input, "org_2")).rejects.toThrow(
      "Product not found or not authorized",
    );
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(updateProductDb(input, "org_1")).rejects.toThrow(
      "Config Error",
    );
  });
});

describe("getProductByIdDb", () => {
  it("reads one of the org's products, uncached", async () => {
    sql.respond(() => [product]);
    await expect(getProductByIdDb("p1", "org_1")).resolves.toEqual(product);
    expect(sql.calls[0].text).toContain("status != 'deleted'");
    expect(sql.calls[0].values).toEqual(["p1", "org_1"]);
  });

  it("returns null when there's no such product", async () => {
    await expect(getProductByIdDb("p1", "org_1")).resolves.toBeNull();
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getProductByIdDb("p1", "org_1")).rejects.toThrow(
      "Config Error",
    );
  });
});
