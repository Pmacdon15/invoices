import { describe, expect, it, vi } from "vitest";
import {
  CUSTOMER,
  ctxWith,
  customer,
  err,
  ok,
  PRODUCT,
  product,
} from "./helpers";

const mocks = vi.hoisted(() => ({
  getCustomers: vi.fn(),
  getCustomerByIdDal: vi.fn(),
  createCustomerDal: vi.fn(),
  updateCustomerDal: vi.fn(),
  deleteCustomerDal: vi.fn(),
  getProducts: vi.fn(),
  getProductByIdDal: vi.fn(),
  createProductDal: vi.fn(),
  updateProductDal: vi.fn(),
  deleteProductDal: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/dal/customers", () => mocks);
vi.mock("@/dal/products", () => mocks);
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

import {
  createCustomerTool,
  createProductTool,
  customerView,
  deleteCustomerTool,
  deleteProductTool,
  getCustomerTool,
  listCustomersTool,
  listProductsTool,
  updateCustomerTool,
  updateProductTool,
} from "@/mcp/catalog-tools";

const ctx = ctxWith();
const page = <T>(data: T[], totalCount = data.length) => ({
  data: { data, currentPage: 1, totalPages: 1, totalCount },
  error: null,
});

describe("customerView", () => {
  it("joins the address and fills missing fields with null", () => {
    expect(customerView(customer)).toMatchObject({
      customer_id: CUSTOMER,
      address: "1 Main St, Calgary, AB T2P 1J9, Canada",
    });
    expect(
      customerView({
        id: "c",
        name: "Bo",
        email: "b@x.test",
        org_id: "o",
        status: "active",
      }),
    ).toEqual({
      customer_id: "c",
      name: "Bo",
      email: "b@x.test",
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      region: null,
      postal_code: null,
      country: null,
      address: null,
      status: "active",
    });
  });
});

describe("customers", () => {
  it("lists and searches", async () => {
    mocks.getCustomers.mockResolvedValue(page([customer], 1));
    const found = await listCustomersTool(ctx, { query: "acme", page: 2 });
    expect(mocks.getCustomers).toHaveBeenCalledWith(2, false, "acme", ctx);
    expect(found.summary).toBe("1 customer(s); page 2 of 1.");

    mocks.getCustomers.mockResolvedValue(page([]));
    expect((await listCustomersTool(ctx, { query: "zed" })).summary).toBe(
      'No customers match "zed".',
    );
    expect((await listCustomersTool(ctx, { query: "" })).summary).toBe(
      "There are no customers yet.",
    );
    expect(mocks.getCustomers).toHaveBeenLastCalledWith(
      1,
      false,
      undefined,
      ctx,
    );

    mocks.getCustomers.mockResolvedValue({ data: null, error: "No org" });
    expect((await listCustomersTool(ctx, {})).isError).toBe(true);
  });

  it("gets one", async () => {
    mocks.getCustomerByIdDal.mockResolvedValue({ data: customer, error: null });
    expect(
      (await getCustomerTool(ctx, { customer_id: CUSTOMER })).summary,
    ).toBe("Acme Corp <billing@acme.test>.");
    mocks.getCustomerByIdDal.mockResolvedValue({
      data: null,
      error: "Customer not found",
    });
    expect(
      (await getCustomerTool(ctx, { customer_id: CUSTOMER })).isError,
    ).toBe(true);
  });

  it("creates with contact details, active, and expires the list", async () => {
    mocks.createCustomerDal.mockResolvedValue(ok(customer));
    const result = await createCustomerTool(ctx, {
      org_id: "org_1",
      name: "Acme Corp",
      email: "billing@acme.test",
      city: "Calgary",
    });
    expect(mocks.createCustomerDal).toHaveBeenCalledWith(
      {
        name: "Acme Corp",
        email: "billing@acme.test",
        city: "Calgary",
        status: "active",
      },
      ctx,
    );
    expect(result.summary).toBe(
      "Added customer Acme Corp <billing@acme.test>.",
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith("customers-org_1", {
      expire: 0,
    });

    mocks.revalidateTag.mockClear();
    mocks.createCustomerDal.mockResolvedValue(
      err({
        reason:
          "Usage limit reached, limit: 4 customers total with your plan. Consider upgrading",
      }),
    );
    const limited = await createCustomerTool(ctx, { name: "B", email: "b@x" });
    expect(limited.isError).toBe(true);
    expect(limited.summary).toContain("Usage limit reached");
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("updates only what changed, keeping status", async () => {
    mocks.getCustomerByIdDal.mockResolvedValue({ data: customer, error: null });
    mocks.updateCustomerDal.mockResolvedValue(ok({ ...customer, phone: "1" }));
    const result = await updateCustomerTool(ctx, {
      customer_id: CUSTOMER,
      phone: "1",
      address_line2: "",
    });
    expect(mocks.updateCustomerDal).toHaveBeenCalledWith(
      {
        id: CUSTOMER,
        name: "Acme Corp",
        email: "billing@acme.test",
        phone: "1",
        address_line1: "1 Main St",
        address_line2: "",
        city: "Calgary",
        region: "AB",
        postal_code: "T2P 1J9",
        country: "Canada",
        status: "active",
      },
      ctx,
    );
    expect(result.summary).toContain("Updated Acme Corp");

    mocks.updateCustomerDal.mockResolvedValue(
      err({ reason: "Validation failed" }),
    );
    expect(
      (await updateCustomerTool(ctx, { customer_id: CUSTOMER })).isError,
    ).toBe(true);
    mocks.getCustomerByIdDal.mockResolvedValue({
      data: null,
      error: "Customer not found",
    });
    expect(
      (await updateCustomerTool(ctx, { customer_id: CUSTOMER })).summary,
    ).toBe("Customer not found");
  });

  it("previews a delete, and deletes only with confirm", async () => {
    mocks.getCustomerByIdDal.mockResolvedValue({ data: customer, error: null });
    const preview = await deleteCustomerTool(ctx, { customer_id: CUSTOMER });
    expect(preview.data.status).toBe("needs_confirmation");
    expect(mocks.deleteCustomerDal).not.toHaveBeenCalled();

    mocks.deleteCustomerDal.mockResolvedValue(ok(customer));
    const done = await deleteCustomerTool(ctx, {
      customer_id: CUSTOMER,
      confirm: true,
    });
    expect(done.summary).toBe("Deleted customer Acme Corp.");

    mocks.deleteCustomerDal.mockResolvedValue(
      err({ reason: "Db failed to delete customer" }),
    );
    expect(
      (await deleteCustomerTool(ctx, { customer_id: CUSTOMER, confirm: true }))
        .isError,
    ).toBe(true);
    mocks.getCustomerByIdDal.mockResolvedValue({
      data: null,
      error: "Customer not found",
    });
    expect(
      (await deleteCustomerTool(ctx, { customer_id: CUSTOMER })).isError,
    ).toBe(true);
  });
});

describe("products", () => {
  it("lists and searches", async () => {
    mocks.getProducts.mockResolvedValue(page([product]));
    const result = await listProductsTool(ctx, { query: "cons" });
    expect(mocks.getProducts).toHaveBeenCalledWith(1, false, "cons", ctx);
    expect(result.data.products).toEqual([
      { product_id: PRODUCT, name: "Consulting", price: 50, status: "active" },
    ]);
    mocks.getProducts.mockResolvedValue(page([]));
    expect((await listProductsTool(ctx, { query: "x" })).summary).toBe(
      'No products match "x".',
    );
    expect((await listProductsTool(ctx, { page: 3 })).summary).toBe(
      "There are no products yet.",
    );
    mocks.getProducts.mockResolvedValue({ data: null, error: "No org" });
    expect((await listProductsTool(ctx, {})).isError).toBe(true);
  });

  it("creates", async () => {
    mocks.createProductDal.mockResolvedValue(ok(product));
    expect(
      (await createProductTool(ctx, { name: "Consulting", price: 50 })).summary,
    ).toBe("Added product Consulting at $50.00.");
    expect(mocks.createProductDal).toHaveBeenCalledWith(
      { name: "Consulting", price: 50, status: "active" },
      ctx,
    );
    mocks.createProductDal.mockResolvedValue(
      err({ reason: "Db failed to create product" }),
    );
    expect(
      (await createProductTool(ctx, { name: "X", price: 1 })).isError,
    ).toBe(true);
  });

  it("changes the price for new invoices, keeping the name", async () => {
    mocks.getProductByIdDal.mockResolvedValue({
      data: { ...product, price: "50.00" },
      error: null,
    });
    mocks.updateProductDal.mockResolvedValue(ok({ ...product, price: 60 }));
    const result = await updateProductTool(ctx, {
      product_id: PRODUCT,
      price: 60,
    });
    expect(mocks.updateProductDal).toHaveBeenCalledWith(
      { id: PRODUCT, name: "Consulting", price: 60, status: "active" },
      ctx,
    );
    expect(result.summary).toContain("Existing invoices keep their prices");

    await updateProductTool(ctx, { product_id: PRODUCT, name: "Advice" });
    expect(mocks.updateProductDal).toHaveBeenLastCalledWith(
      { id: PRODUCT, name: "Advice", price: 50, status: "active" },
      ctx,
    );

    mocks.updateProductDal.mockResolvedValue(
      err({ reason: "Db failed to update product" }),
    );
    expect(
      (await updateProductTool(ctx, { product_id: PRODUCT })).isError,
    ).toBe(true);
    mocks.getProductByIdDal.mockResolvedValue({
      data: null,
      error: "Product not found",
    });
    expect(
      (await updateProductTool(ctx, { product_id: PRODUCT })).isError,
    ).toBe(true);
  });

  it("previews a delete, and deletes only with confirm", async () => {
    mocks.getProductByIdDal.mockResolvedValue({ data: product, error: null });
    expect(
      (await deleteProductTool(ctx, { product_id: PRODUCT })).data.status,
    ).toBe("needs_confirmation");
    expect(mocks.deleteProductDal).not.toHaveBeenCalled();
    mocks.deleteProductDal.mockResolvedValue(ok(product));
    expect(
      (await deleteProductTool(ctx, { product_id: PRODUCT, confirm: true }))
        .summary,
    ).toBe("Deleted product Consulting.");
    mocks.deleteProductDal.mockResolvedValue(
      err({ reason: "Db failed to delete product" }),
    );
    expect(
      (await deleteProductTool(ctx, { product_id: PRODUCT, confirm: true }))
        .isError,
    ).toBe(true);
    mocks.getProductByIdDal.mockResolvedValue({
      data: null,
      error: "Product not found",
    });
    expect(
      (await deleteProductTool(ctx, { product_id: PRODUCT })).isError,
    ).toBe(true);
  });
});
