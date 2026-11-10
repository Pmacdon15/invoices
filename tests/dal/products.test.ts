import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  protect: vi.fn(),
  has: vi.fn(),
  createProductDb: vi.fn(),
  deleteProductDb: vi.fn(),
  fetchingProductsDb: vi.fn(),
  getProductCount: vi.fn(),
  searchProductsDb: vi.fn(),
  updateProductDb: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: mocks.protect },
}));
vi.mock("@/db/products", () => ({
  createProductDb: mocks.createProductDb,
  deleteProductDb: mocks.deleteProductDb,
  fetchingProductsDb: mocks.fetchingProductsDb,
  getProductCount: mocks.getProductCount,
  searchProductsDb: mocks.searchProductsDb,
  updateProductDb: mocks.updateProductDb,
}));

import {
  createProductDal,
  deleteProductDal,
  getProducts,
  searchProductsDal,
  updateProductDal,
} from "@/dal/products";

const ID = "11111111-1111-4111-8111-111111111111";
const input = {
  name: "Widget",
  price: 12.5,
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

describe("getProducts", () => {
  it("returns the org's products", async () => {
    const page = { data: [], currentPage: 2, totalPages: 3, totalCount: 25 };
    mocks.fetchingProductsDb.mockResolvedValue(page);

    await expect(getProducts(2, false, "wid")).resolves.toEqual({
      data: page,
      error: null,
    });
    expect(mocks.fetchingProductsDb).toHaveBeenCalledWith(
      "org_1",
      2,
      false,
      "wid",
    );
  });

  it("defaults to the first page", async () => {
    mocks.fetchingProductsDb.mockResolvedValue({});
    await getProducts();
    expect(mocks.fetchingProductsDb).toHaveBeenCalledWith(
      "org_1",
      1,
      false,
      undefined,
    );
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    await expect(getProducts()).resolves.toEqual({
      data: null,
      error: "No org",
    });
    expect(mocks.fetchingProductsDb).not.toHaveBeenCalled();
  });

  it("reports a database failure", async () => {
    mocks.fetchingProductsDb.mockRejectedValue(new Error("down"));
    await expect(getProducts()).resolves.toEqual({
      data: null,
      error: "Database error occurred.",
    });
  });
});

describe("createProductDal", () => {
  it("creates the product in the caller's org", async () => {
    signIn(["create_up_to_5_products"]);
    mocks.getProductCount.mockResolvedValue(4);
    mocks.createProductDb.mockResolvedValue({ id: ID, ...input });

    const result = await createProductDal(input);

    expect(result._unsafeUnwrap()).toEqual({ id: ID, ...input });
    expect(mocks.createProductDb).toHaveBeenCalledWith(input, "org_1");
    expect(mocks.getProductCount).toHaveBeenCalledWith("org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    const result = await createProductDal(input);
    expect(result._unsafeUnwrapErr()).toEqual({ reason: "Not authorized" });
    expect(mocks.createProductDb).not.toHaveBeenCalled();
  });

  it.each([
    ["create_up_to_100_products", 100],
    ["create_up_to_10_products", 10],
    ["create_up_to_5_products", 5],
  ])("enforces the %s plan limit of %i", async (feature, limit) => {
    signIn([feature]);
    mocks.getProductCount.mockResolvedValue(limit);

    const result = await createProductDal(input);

    expect(result._unsafeUnwrapErr()).toEqual({
      reason: `Usage limit reached, limit: ${limit} products total with your plan. Consider upgrading`,
    });
    expect(mocks.createProductDb).not.toHaveBeenCalled();
  });

  it("uses the best plan when the caller has several", async () => {
    signIn(["create_up_to_5_products", "create_up_to_100_products"]);
    mocks.getProductCount.mockResolvedValue(50);
    mocks.createProductDb.mockResolvedValue({ id: ID });

    expect((await createProductDal(input)).isOk()).toBe(true);
  });

  it("allows nothing without a plan", async () => {
    mocks.getProductCount.mockResolvedValue(0);
    const result = await createProductDal(input);
    expect(result._unsafeUnwrapErr().reason).toBe(
      "Usage limit reached, limit: 0 products total with your plan. Consider upgrading",
    );
  });

  it("reads plan slugs and limits from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PRO_PRODUCTS_SLUG", "pro");
    vi.stubEnv("NEXT_PUBLIC_CLERK_BASIC_PRODUCTS_SLUG", "basic");
    vi.stubEnv("NEXT_PUBLIC_CLERK_FREE_PRODUCTS_SLUG", "free");
    vi.stubEnv("NEXT_PUBLIC_PRO_LIMIT", "7");
    vi.stubEnv("NEXT_PUBLIC_BASIC_PRODUCT_LIMIT", "3");
    vi.stubEnv("NEXT_PUBLIC_FREE_PRODUCT_LIMIT", "1");
    mocks.getProductCount.mockResolvedValue(1);

    for (const [feature, limit, ok] of [
      ["pro", 7, true],
      ["basic", 3, true],
      ["free", 1, false],
    ] as const) {
      signIn([feature]);
      mocks.createProductDb.mockResolvedValue({ id: ID });
      const result = await createProductDal(input);
      expect(result.isOk(), `${feature} (${limit})`).toBe(ok);
    }
  });

  it("fails closed when the usage count can't be read", async () => {
    signIn(["create_up_to_100_products"]);
    mocks.getProductCount.mockRejectedValue(new Error("down"));

    const result = await createProductDal(input);

    expect(result._unsafeUnwrapErr()).toEqual({
      reason: "Failed to verify limits",
    });
    expect(mocks.createProductDb).not.toHaveBeenCalled();
  });

  it("rejects invalid input with a field error tree", async () => {
    signIn(["create_up_to_100_products"]);
    mocks.getProductCount.mockResolvedValue(0);

    const result = await createProductDal({
      ...input,
      name: "A",
      price: -1,
    });

    const error = result._unsafeUnwrapErr();
    expect(error.reason).toBe("Validation failed");
    const errors = (
      error as { errors: { properties: Record<string, unknown> } }
    ).errors.properties;
    expect(errors.name).toEqual({
      errors: ["Product name must be at least 2 characters"],
    });
    expect(errors.price).toEqual({ errors: ["Price must be positive"] });
    expect(mocks.createProductDb).not.toHaveBeenCalled();
  });

  it("reports a failed insert", async () => {
    signIn(["create_up_to_100_products"]);
    mocks.getProductCount.mockResolvedValue(0);
    mocks.createProductDb.mockRejectedValue(new Error("dup"));

    const result = await createProductDal(input);
    expect(result._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to create product",
    });
  });
});

describe("deleteProductDal", () => {
  it("deletes the product within the caller's org", async () => {
    mocks.deleteProductDb.mockResolvedValue({ id: ID, status: "deleted" });
    const result = await deleteProductDal(ID);
    expect(result._unsafeUnwrap()).toEqual({ id: ID, status: "deleted" });
    expect(mocks.deleteProductDb).toHaveBeenCalledWith(ID, "org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    expect((await deleteProductDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
  });

  it("rejects an id that isn't a UUID", async () => {
    const result = await deleteProductDal("1; DROP TABLE products");
    expect(result._unsafeUnwrapErr().reason).toBe("Validation failed");
    expect(mocks.deleteProductDb).not.toHaveBeenCalled();
  });

  it("reports a failed delete", async () => {
    mocks.deleteProductDb.mockRejectedValue(new Error("not found"));
    expect((await deleteProductDal(ID))._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to delete product",
    });
  });
});

describe("searchProductsDal", () => {
  it("searches within the caller's org", async () => {
    mocks.searchProductsDb.mockResolvedValue([{ id: ID }]);
    await expect(searchProductsDal("wid")).resolves.toEqual({
      data: [{ id: ID }],
      error: null,
    });
    expect(mocks.searchProductsDb).toHaveBeenCalledWith("org_1", "wid");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    await expect(searchProductsDal("wid")).resolves.toEqual({
      data: null,
      error: "No org",
    });
  });

  it("reports a database failure", async () => {
    mocks.searchProductsDb.mockRejectedValue(new Error("down"));
    await expect(searchProductsDal("wid")).resolves.toEqual({
      data: null,
      error: "Database error occurred.",
    });
  });
});

describe("updateProductDal", () => {
  const update = { ...input, id: ID };

  it("updates with the validated data in the caller's org", async () => {
    mocks.updateProductDb.mockResolvedValue(update);
    const result = await updateProductDal({
      ...update,
      extra: "dropped",
    } as never);
    expect(result._unsafeUnwrap()).toEqual(update);
    expect(mocks.updateProductDb).toHaveBeenCalledWith(update, "org_1");
  });

  it("refuses a caller with no org", async () => {
    signIn([], null);
    expect((await updateProductDal(update))._unsafeUnwrapErr()).toEqual({
      reason: "Not authorized",
    });
  });

  it("rejects invalid input", async () => {
    const result = await updateProductDal({ ...update, id: "nope" });
    expect(result._unsafeUnwrapErr().reason).toBe("Validation failed");
    expect(mocks.updateProductDb).not.toHaveBeenCalled();
  });

  it("reports a failed update", async () => {
    mocks.updateProductDb.mockRejectedValue(new Error("not found"));
    expect((await updateProductDal(update))._unsafeUnwrapErr()).toEqual({
      reason: "Db failed to update product",
    });
  });
});
