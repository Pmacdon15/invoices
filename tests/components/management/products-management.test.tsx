import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProductsManagement } from "@/components/management/products-management";
import type { PaginatedValue, Product, Result } from "@/dal/types";
import { fail, ORG, ok, page, product } from "../helpers-forms/fixtures";
import { applyOptimistic } from "../helpers-forms/optimistic";

type SetOptimistic = (a: unknown) => void;
const captured = vi.hoisted(() => ({
  set: null as null | SetOptimistic,
  add: null as null | ((p: unknown) => void),
  orgId: undefined as undefined | string,
}));

vi.mock("@/components/create-product-dialog", () => ({
  CreateProductDialog: (p: {
    orgId?: string;
    onOptimistic: (p: unknown) => void;
  }) => {
    captured.add = p.onOptimistic;
    captured.orgId = p.orgId;
    return null;
  },
}));
vi.mock("@/components/tables/products-table", () => ({
  ProductsTable: (p: {
    data: Product[];
    totalPages: number;
    currentPage: number;
    totalCount: number;
    setOptimistic: SetOptimistic;
  }) => {
    captured.set = p.setOptimistic;
    return (
      <div>
        <p>
          {p.totalCount} total, page {p.currentPage}/{p.totalPages}
        </p>
        <ul>
          {p.data.map((x) => (
            <li key={x.id}>{x.name}</li>
          ))}
        </ul>
      </div>
    );
  },
}));

const consulting = product();
const design = product({
  id: "66666666-6666-4666-8666-666666666666",
  name: "Design",
});

async function renderIt(promise: Promise<Result<PaginatedValue<Product>>>) {
  await act(async () => {
    render(
      <Suspense>
        <ProductsManagement dataPromise={promise} />
      </Suspense>,
    );
  });
}

const names = () => screen.getAllByRole("listitem").map((li) => li.textContent);

describe("ProductsManagement", () => {
  it("shows the load error", async () => {
    await renderIt(fail("db down"));
    expect(screen.getByText("Error: db down")).toBeInTheDocument();
  });

  it("passes the page to the table and the org to the dialog", async () => {
    await renderIt(
      ok(
        page([consulting, design], {
          currentPage: 2,
          totalPages: 3,
          totalCount: 9,
        }),
      ),
    );
    expect(
      screen.getByText("Manage your goods and services."),
    ).toBeInTheDocument();
    expect(screen.getByText("9 total, page 2/3")).toBeInTheDocument();
    expect(names()).toEqual(["Consulting", "Design"]);
    expect(captured.orgId).toBe(ORG);
  });

  it("falls back to no org, page 1 of 1 and zero products", async () => {
    await renderIt(ok({ data: [] } as unknown as PaginatedValue<Product>));
    expect(captured.orgId).toBeUndefined();
    expect(screen.getByText("0 total, page 1/1")).toBeInTheDocument();
  });

  it("adds a new product to the top optimistically", async () => {
    await renderIt(ok(page([consulting])));
    const added = product({ id: "n", name: "Hosting" });
    await applyOptimistic((p: Product) => captured.add?.(p), added);
    expect(names()).toEqual(["Hosting", "Consulting"]);
    expect(screen.getByText("2 total, page 1/1")).toBeInTheDocument();
  });

  it("removes a deleted product optimistically", async () => {
    await renderIt(ok(page([consulting, design])));
    await applyOptimistic(captured.set as SetOptimistic, {
      type: "delete",
      payload: consulting.id,
    });
    expect(names()).toEqual(["Design"]);
    expect(screen.getByText("1 total, page 1/1")).toBeInTheDocument();
  });

  it("replaces an updated product optimistically", async () => {
    await renderIt(ok(page([consulting, design])));
    await applyOptimistic(captured.set as SetOptimistic, {
      type: "update",
      payload: { ...design, name: "Design Pro" },
    });
    expect(names()).toEqual(["Consulting", "Design Pro"]);
  });

  it("ignores an unknown optimistic action", async () => {
    await renderIt(ok(page([consulting])));
    await applyOptimistic(captured.set as SetOptimistic, { type: "noop" });
    expect(names()).toEqual(["Consulting"]);
  });
});
