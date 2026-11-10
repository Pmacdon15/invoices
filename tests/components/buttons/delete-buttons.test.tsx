import "../helpers/dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { customers, invoices, products } = vi.hoisted(() => {
  const make = () => ({ mutate: vi.fn(), isPending: false });
  return { customers: make(), invoices: make(), products: make() };
});
vi.mock("@/mutations/customers", () => ({
  useDeleteCustomer: () => customers,
}));
vi.mock("@/mutations/invoices", () => ({
  useDeleteInvoice: () => invoices,
}));
vi.mock("@/mutations/products", () => ({
  useDeleteProduct: () => products,
}));

import DeleteCustomerButton from "@/components/buttons/delete-customer-button";
import DeleteInvoiceButton from "@/components/buttons/delete-invoice-button";
import DeleteProductButton from "@/components/buttons/delete-product-button";

type Case = {
  name: string;
  hook: { mutate: ReturnType<typeof vi.fn>; isPending: boolean };
  confirm: string;
  description: RegExp;
  render: (setOptimistic: (id: string) => void) => ReturnType<typeof render>;
};

const Customer = DeleteCustomerButton as ComponentType<{
  rowId: string;
  setOptimisticCustomers: (id: string) => void;
}>;

const cases: Case[] = [
  {
    name: "customer",
    hook: customers,
    confirm: "Delete Customer",
    description: /customer and all associated data/,
    render: (set) =>
      render(<Customer rowId="row-1" setOptimisticCustomers={set} />),
  },
  {
    name: "invoice",
    hook: invoices,
    confirm: "Delete Invoice",
    description: /permanently delete the\s+invoice/,
    render: (set) =>
      render(<DeleteInvoiceButton rowId="row-1" setOptimisticInvoices={set} />),
  },
  {
    name: "product",
    hook: products,
    confirm: "Delete Product",
    description: /remove it from our servers/,
    render: (set) =>
      render(
        <DeleteProductButton productId="row-1" setOptimisticProducts={set} />,
      ),
  },
];

describe.each(cases)("Delete $name button", (c) => {
  beforeEach(() => {
    c.hook.isPending = false;
  });

  it("asks for confirmation before deleting", async () => {
    const setOptimistic = vi.fn();
    c.render(setOptimistic);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName(
      "Are you absolutely sure?",
    );
    expect(screen.getByText(c.description)).toBeInTheDocument();
    expect(c.hook.mutate).not.toHaveBeenCalled();
  });

  it("removes the row optimistically and deletes it on confirm", async () => {
    const setOptimistic = vi.fn();
    c.render(setOptimistic);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button", { name: c.confirm }));
    await waitFor(() => expect(c.hook.mutate).toHaveBeenCalledWith("row-1"));
    expect(setOptimistic).toHaveBeenCalledWith("row-1");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does nothing when cancelled", async () => {
    const setOptimistic = vi.fn();
    c.render(setOptimistic);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(c.hook.mutate).not.toHaveBeenCalled();
    expect(setOptimistic).not.toHaveBeenCalled();
  });

  it("is disabled with a spinner while deleting", () => {
    c.hook.isPending = true;
    c.render(vi.fn());
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).toBeTruthy();
  });
});
