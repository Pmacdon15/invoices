import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  redirect: vi.fn(),
  createCustomerDal: vi.fn(),
  deleteCustomerDal: vi.fn(),
  updateCustomerDal: vi.fn(),
  createProductDal: vi.fn(),
  deleteProductDal: vi.fn(),
  updateProductDal: vi.fn(),
  createInvoiceDal: vi.fn(),
  deleteInvoiceDal: vi.fn(),
  sendInvoiceDal: vi.fn(),
  updateInvoiceDal: vi.fn(),
  updateInvoiceStatusDal: vi.fn(),
  updateInvoicePrefixDal: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/dal/customers", () => ({
  createCustomerDal: mocks.createCustomerDal,
  deleteCustomerDal: mocks.deleteCustomerDal,
  updateCustomerDal: mocks.updateCustomerDal,
}));
vi.mock("@/dal/products", () => ({
  createProductDal: mocks.createProductDal,
  deleteProductDal: mocks.deleteProductDal,
  updateProductDal: mocks.updateProductDal,
}));
vi.mock("@/dal/invoices", () => ({
  createInvoiceDal: mocks.createInvoiceDal,
  deleteInvoiceDal: mocks.deleteInvoiceDal,
  sendInvoiceDal: mocks.sendInvoiceDal,
  updateInvoiceDal: mocks.updateInvoiceDal,
  updateInvoiceStatusDal: mocks.updateInvoiceStatusDal,
}));

vi.mock("@/dal/org-settings", () => ({
  updateInvoicePrefixDal: mocks.updateInvoicePrefixDal,
}));

import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/actions/customers";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  sendInvoiceAction,
  updateInvoiceAction,
  updateInvoiceStatusAction,
} from "@/actions/invoices";
import { updateInvoicePrefixAction } from "@/actions/org-settings";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/actions/products";

const record = { id: "inv-1", org_id: "org_1" };

type Case = {
  name: string;
  run: () => Promise<unknown>;
  dal: keyof typeof mocks;
  dalArgs: unknown[];
  tags: string[];
};

const customerInput = { name: "Ann", email: "ann@x.com", status: "active" };
const productInput = { name: "Widget", price: 5, status: "active" };
const invoiceInput = { customer_id: "c", status: "draft", items: [] };

const cases: Case[] = [
  {
    name: "createCustomerAction",
    run: () => createCustomerAction(customerInput as never),
    dal: "createCustomerDal",
    dalArgs: [customerInput],
    tags: ["customers-org_1"],
  },
  {
    name: "deleteCustomerAction",
    run: () => deleteCustomerAction("c-1"),
    dal: "deleteCustomerDal",
    dalArgs: ["c-1"],
    tags: ["customers-org_1"],
  },
  {
    name: "updateCustomerAction",
    run: () => updateCustomerAction({ ...customerInput, id: "c" } as never),
    dal: "updateCustomerDal",
    dalArgs: [{ ...customerInput, id: "c" }],
    tags: ["customers-org_1"],
  },
  {
    name: "createProductAction",
    run: () => createProductAction(productInput as never),
    dal: "createProductDal",
    dalArgs: [productInput],
    tags: ["products-org_1"],
  },
  {
    name: "deleteProductAction",
    run: () => deleteProductAction("p-1"),
    dal: "deleteProductDal",
    dalArgs: ["p-1"],
    tags: ["products-org_1"],
  },
  {
    name: "updateProductAction",
    run: () => updateProductAction({ ...productInput, id: "p" } as never),
    dal: "updateProductDal",
    dalArgs: [{ ...productInput, id: "p" }],
    tags: ["products-org_1"],
  },
  {
    name: "createInvoiceAction",
    run: () => createInvoiceAction(invoiceInput as never),
    dal: "createInvoiceDal",
    dalArgs: [invoiceInput],
    tags: ["invoices-org_1", "stats-org_1"],
  },
  {
    name: "deleteInvoiceAction",
    run: () => deleteInvoiceAction("inv-1"),
    dal: "deleteInvoiceDal",
    dalArgs: ["inv-1"],
    tags: ["invoices-org_1", "invoice-inv-1", "stats-org_1"],
  },
  {
    name: "updateInvoiceStatusAction",
    run: () => updateInvoiceStatusAction("inv-1", "paid"),
    dal: "updateInvoiceStatusDal",
    dalArgs: ["inv-1", "paid"],
    tags: ["invoices-org_1", "invoice-inv-1", "stats-org_1"],
  },
  {
    name: "sendInvoiceAction",
    run: () => sendInvoiceAction("inv-1"),
    dal: "sendInvoiceDal",
    dalArgs: ["inv-1"],
    tags: ["invoices-org_1", "invoice-inv-1", "stats-org_1"],
  },
  {
    name: "updateInvoiceAction",
    run: () => updateInvoiceAction({ ...invoiceInput, id: "inv-1" } as never),
    dal: "updateInvoiceDal",
    dalArgs: [{ ...invoiceInput, id: "inv-1" }],
    tags: ["invoices-org_1", "invoice-inv-1", "stats-org_1"],
  },
  {
    name: "updateInvoicePrefixAction",
    run: () => updateInvoicePrefixAction("ACME"),
    dal: "updateInvoicePrefixDal",
    dalArgs: ["ACME"],
    tags: ["org-settings-org_1"],
  },
];

describe.each(cases)("$name", ({ run, dal, dalArgs, tags }) => {
  const dalMock = mocks[dal];

  beforeEach(() => {
    mocks.updateTag.mockReset();
    mocks.redirect.mockReset();
  });

  it("returns the record and invalidates its cache tags", async () => {
    dalMock.mockResolvedValue(okAsync(record));

    await expect(run()).resolves.toEqual({ data: record });

    expect(dalMock).toHaveBeenCalledWith(...dalArgs);
    expect(mocks.updateTag.mock.calls.map(([tag]) => tag)).toEqual(tags);
  });

  it("returns the DAL error as a message and leaves the cache alone", async () => {
    dalMock.mockResolvedValue(errAsync({ reason: "Failed to verify limits" }));

    await expect(run()).resolves.toEqual({
      message: "Failed to verify limits",
    });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("returns validation errors to the form", async () => {
    const errors = { properties: { name: { errors: ["Too short"] } } };
    dalMock.mockResolvedValue(
      errAsync({ reason: "Validation failed", errors }),
    );

    await expect(run()).resolves.toEqual({
      message: "Data validation on submitted data has failed",
      errors,
    });
  });

  it("redirects home when the caller is not authorized", async () => {
    dalMock.mockResolvedValue(errAsync({ reason: "Not authorized" }));

    await run();

    expect(mocks.redirect).toHaveBeenCalledWith("/");
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
