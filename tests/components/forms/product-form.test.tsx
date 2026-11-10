import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "@/components/forms/product-form";
import { ORG, product } from "../helpers-forms/fixtures";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  creating: false,
  updating: false,
}));
vi.mock("@/mutations/products", () => ({
  useCreateProduct: () => ({ mutate: m.create, isPending: m.creating }),
  useUpdateProduct: () => ({ mutate: m.update, isPending: m.updating }),
}));

beforeEach(() => {
  m.creating = false;
  m.updating = false;
});

describe("ProductForm", () => {
  it("renders as a card with the add title by default", () => {
    render(<ProductForm orgId={ORG} />);
    expect(screen.getByText("Add New Product")).toBeInTheDocument();
    expect(
      screen.getByText("Define a new product or service for your invoices."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Standard Price")).toHaveValue(0);
  });

  it("creates an active product with a numeric price", async () => {
    const user = userEvent.setup();
    const onOptimistic = vi.fn();
    render(<ProductForm orgId={ORG} isModal onOptimistic={onOptimistic} />);

    expect(screen.queryByText("Add New Product")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Product Name"), "Design");
    const price = screen.getByLabelText("Standard Price");
    await user.clear(price);
    await user.type(price, "49.5");
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    await waitFor(() =>
      expect(m.create).toHaveBeenCalledWith({
        name: "Design",
        price: 49.5,
        status: "active",
      }),
    );
    expect(onOptimistic).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Design",
        price: 49.5,
        org_id: ORG,
        status: "active",
        id: expect.any(String),
      }),
    );
  });

  it("creates without an optimistic callback", async () => {
    const user = userEvent.setup();
    render(<ProductForm orgId={ORG} />);
    await user.type(screen.getByLabelText("Product Name"), "Audit");
    await user.click(screen.getByRole("button", { name: "Save Product" }));
    await waitFor(() => expect(m.create).toHaveBeenCalledOnce());
  });

  it("edits an existing product, keeping its id and status", async () => {
    const user = userEvent.setup();
    const existing = product({ status: "disabled" });
    const onOptimistic = vi.fn();
    render(
      <ProductForm
        orgId={ORG}
        initialData={existing}
        onOptimistic={onOptimistic}
      />,
    );

    expect(screen.getByText("Edit Product")).toBeInTheDocument();
    expect(
      screen.getByText("Update the product details below."),
    ).toBeInTheDocument();
    const price = screen.getByLabelText("Standard Price");
    expect(price).toHaveValue(100);
    await user.clear(price);
    await user.type(price, "120");
    await user.click(screen.getByRole("button", { name: "Update Product" }));

    await waitFor(() =>
      expect(m.update).toHaveBeenCalledWith({
        name: existing.name,
        price: 120,
        id: existing.id,
        status: "disabled",
      }),
    );
    expect(onOptimistic).toHaveBeenCalledWith({
      name: existing.name,
      price: 120,
      id: existing.id,
      org_id: ORG,
      status: "disabled",
    });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("shows a disabled saving button while a mutation runs", () => {
    m.creating = true;
    render(<ProductForm orgId={ORG} />);
    expect(screen.getByRole("button", { name: /Saving/ })).toBeDisabled();
  });
});
