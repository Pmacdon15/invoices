import "../helpers-forms/dom";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { InvoicesManagement } from "@/components/management/invoices-management";
import type {
  Customer,
  Invoice,
  PaginatedValue,
  Product,
  Result,
} from "@/dal/types";
import {
  customer,
  fail,
  invoice,
  ok,
  page,
  product,
} from "../helpers-forms/fixtures";
import { applyOptimistic } from "../helpers-forms/optimistic";

type SetOptimistic = (a: unknown) => void;
const captured = vi.hoisted(() => ({
  set: null as null | SetOptimistic,
  add: null as null | ((i: unknown) => void),
  dialogProps: null as null | Record<string, unknown>,
}));

vi.mock("@/components/create-invoice-dialog", () => ({
  CreateInvoiceDialog: (p: {
    customersPromise: unknown;
    productsPromise: unknown;
    onOptimistic: (i: unknown) => void;
  }) => {
    captured.add = p.onOptimistic;
    captured.dialogProps = p;
    return null;
  },
}));
vi.mock("@/components/tables/invoices-table", () => ({
  InvoicesTable: (p: {
    data: Invoice[];
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
            <li key={x.id}>
              {x.id}:{x.status}
            </li>
          ))}
        </ul>
      </div>
    );
  },
}));

const draft = invoice({ id: "inv-draft", status: "draft" });
const sent = invoice({ id: "inv-sent", status: "sent" });
const paid = invoice({ id: "inv-paid", status: "paid" });

const customers = ok(page<Customer>([customer()]));
const products = ok(page<Product>([product()]));

async function renderIt(promise: Promise<Result<PaginatedValue<Invoice>>>) {
  await act(async () => {
    render(
      <Suspense>
        <InvoicesManagement
          invoicesPromise={promise}
          customersPromise={customers}
          productsPromise={products}
        />
      </Suspense>,
    );
  });
}

const rows = () =>
  screen.queryAllByRole("listitem").map((li) => li.textContent);

describe("InvoicesManagement", () => {
  it("shows the load error", async () => {
    await renderIt(fail("db down"));
    expect(screen.getByText("Error: db down")).toBeInTheDocument();
  });

  it("passes the page to the table and the lookups to the dialog", async () => {
    await renderIt(
      ok(page([draft, sent], { currentPage: 2, totalPages: 4, totalCount: 7 })),
    );
    expect(
      screen.getByText("Managing your billing and payments."),
    ).toBeInTheDocument();
    expect(screen.getByText("7 total, page 2/4")).toBeInTheDocument();
    expect(rows()).toEqual(["inv-draft:draft", "inv-sent:sent"]);
    expect(captured.dialogProps).toMatchObject({
      customersPromise: customers,
      productsPromise: products,
    });
  });

  it("falls back to page 1 of 1 and zero invoices", async () => {
    await renderIt(ok({ data: [] } as unknown as PaginatedValue<Invoice>));
    expect(screen.getByText("0 total, page 1/1")).toBeInTheDocument();
  });

  it("filters the table by status", async () => {
    const user = userEvent.setup();
    await renderIt(ok(page([draft, sent, paid])));

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Paid" }));
    expect(rows()).toEqual(["inv-paid:paid"]);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Draft" }));
    expect(rows()).toEqual(["inv-draft:draft"]);

    await user.click(screen.getByRole("combobox"));
    await user.click(
      await screen.findByRole("option", { name: "All Statuses" }),
    );
    expect(rows()).toEqual([
      "inv-draft:draft",
      "inv-sent:sent",
      "inv-paid:paid",
    ]);
  });

  it("adds a new invoice to the top optimistically", async () => {
    await renderIt(ok(page([draft])));
    await applyOptimistic((i: Invoice) => captured.add?.(i), sent);
    expect(rows()).toEqual(["inv-sent:sent", "inv-draft:draft"]);
    expect(screen.getByText("2 total, page 1/1")).toBeInTheDocument();
  });

  it("removes a deleted invoice optimistically", async () => {
    await renderIt(ok(page([draft, sent])));
    await applyOptimistic(captured.set as SetOptimistic, {
      type: "delete",
      payload: draft.id,
    });
    expect(rows()).toEqual(["inv-sent:sent"]);
    expect(screen.getByText("1 total, page 1/1")).toBeInTheDocument();
  });

  it("ignores an unknown optimistic action", async () => {
    await renderIt(ok(page([draft])));
    await applyOptimistic(captured.set as SetOptimistic, { type: "noop" });
    expect(rows()).toEqual(["inv-draft:draft"]);
  });
});
