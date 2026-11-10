// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dal = vi.hoisted(() => ({
  searchCustomersDal: vi.fn(),
  searchInvoicesDal: vi.fn(),
  searchProductsDal: vi.fn(),
}));

vi.mock("@/dal/customers", () => ({
  searchCustomersDal: dal.searchCustomersDal,
}));
vi.mock("@/dal/invoices", () => ({ searchInvoicesDal: dal.searchInvoicesDal }));
vi.mock("@/dal/products", () => ({ searchProductsDal: dal.searchProductsDal }));

import { GET as searchCustomers } from "@/app/api/customers/search/route";
import { GET as searchInvoices } from "@/app/api/invoices/search/route";
import { GET as searchProducts } from "@/app/api/products/search/route";

const request = (path: string) =>
  new NextRequest(`https://example.test${path}`);

describe.each([
  {
    name: "customers",
    GET: searchCustomers,
    search: dal.searchCustomersDal,
  },
  { name: "invoices", GET: searchInvoices, search: dal.searchInvoicesDal },
  { name: "products", GET: searchProducts, search: dal.searchProductsDal },
])("GET /api/$name/search", ({ name, GET, search }) => {
  const path = `/api/${name}/search`;

  beforeEach(() => search.mockReset());

  it("returns nothing without querying when there is no query", async () => {
    const res = await GET(request(path));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [] });
    expect(search).not.toHaveBeenCalled();
  });

  it("returns nothing for an empty query", async () => {
    const res = await GET(request(`${path}?query=`));
    expect(await res.json()).toEqual({ data: [] });
    expect(search).not.toHaveBeenCalled();
  });

  it("returns the matches for the query", async () => {
    search.mockResolvedValue({ data: [{ id: 1 }] });
    const res = await GET(request(`${path}?query=acme%20co`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [{ id: 1 }] });
    expect(search).toHaveBeenCalledWith("acme co");
  });

  it("returns a 500 with the error when the search fails", async () => {
    search.mockResolvedValue({ error: "Unauthorized" });
    const res = await GET(request(`${path}?query=x`));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});
