import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { CustomersManagement } from "@/components/management/customers-management";
import type { Customer, PaginatedValue, Result } from "@/dal/types";
import { customer, fail, ORG, ok, page } from "../helpers-forms/fixtures";
import { applyOptimistic } from "../helpers-forms/optimistic";

type SetOptimistic = (a: unknown) => void;
const captured = vi.hoisted(() => ({
  set: null as null | SetOptimistic,
  add: null as null | ((c: unknown) => void),
  orgId: null as null | string,
}));

vi.mock("@/components/create-customer-dialog", () => ({
  CreateCustomerDialog: (p: {
    orgId: string;
    onOptimistic: (c: unknown) => void;
  }) => {
    captured.add = p.onOptimistic;
    captured.orgId = p.orgId;
    return null;
  },
}));
vi.mock("@/components/tables/customer-table", () => ({
  CustomersTable: (p: {
    data: Customer[];
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
          {p.data.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      </div>
    );
  },
}));

const acme = customer();
const globex = customer({
  id: "55555555-5555-4555-8555-555555555555",
  name: "Globex",
});

async function renderIt(promise: Promise<Result<PaginatedValue<Customer>>>) {
  await act(async () => {
    render(
      <Suspense>
        <CustomersManagement resultsPromise={promise} />
      </Suspense>,
    );
  });
}

const names = () => screen.getAllByRole("listitem").map((li) => li.textContent);

describe("CustomersManagement", () => {
  it("shows the load error", async () => {
    await renderIt(fail("db down"));
    expect(screen.getByText("Error: db down")).toBeInTheDocument();
  });

  it("passes the page to the table and the org to the dialog", async () => {
    await renderIt(
      ok(
        page([acme, globex], { currentPage: 2, totalPages: 3, totalCount: 9 }),
      ),
    );
    expect(
      screen.getByText("Manage your customer database."),
    ).toBeInTheDocument();
    expect(screen.getByText("9 total, page 2/3")).toBeInTheDocument();
    expect(names()).toEqual(["Acme Corp", "Globex"]);
    expect(captured.orgId).toBe(ORG);
  });

  it("falls back to an empty org and page 1 of 1", async () => {
    await renderIt(
      ok({
        data: [],
        totalCount: 0,
      } as unknown as PaginatedValue<Customer>),
    );
    expect(captured.orgId).toBe("");
    expect(screen.getByText("0 total, page 1/1")).toBeInTheDocument();
  });

  it("adds a new customer to the top optimistically", async () => {
    await renderIt(ok(page([acme])));
    const added = customer({ id: "n", name: "New Co" });
    await act(async () => {
      captured.add?.(added);
    });
    // Outside a transition the optimistic add reverts at once.
    await applyOptimistic((c: Customer) => captured.add?.(c), added);
    expect(names()).toEqual(["New Co", "Acme Corp"]);
    expect(screen.getByText("2 total, page 1/1")).toBeInTheDocument();
  });

  it("removes a deleted customer optimistically", async () => {
    await renderIt(ok(page([acme, globex])));
    await applyOptimistic(captured.set as SetOptimistic, {
      type: "delete",
      payload: acme.id,
    });
    expect(names()).toEqual(["Globex"]);
    expect(screen.getByText("1 total, page 1/1")).toBeInTheDocument();
  });

  it("replaces an updated customer optimistically", async () => {
    await renderIt(ok(page([acme, globex])));
    await applyOptimistic(captured.set as SetOptimistic, {
      type: "update",
      payload: { ...globex, name: "Globex Intl" },
    });
    expect(names()).toEqual(["Acme Corp", "Globex Intl"]);
  });

  it("ignores an unknown optimistic action", async () => {
    await renderIt(ok(page([acme])));
    await applyOptimistic(captured.set as SetOptimistic, { type: "noop" });
    expect(names()).toEqual(["Acme Corp"]);
  });
});
