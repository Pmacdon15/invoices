import "../helpers-forms/dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductsTable } from "@/components/tables/products-table";
import { product } from "../helpers-forms/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/buttons/delete-product-button", () => ({
  default: ({
    productId,
    setOptimisticProducts,
  }: {
    productId: string;
    setOptimisticProducts: (id: string) => void;
  }) => (
    <button type="button" onClick={() => setOptimisticProducts(productId)}>
      Delete {productId}
    </button>
  ),
}));
const updated = product({ name: "Renamed" });
vi.mock("@/components/forms/product-form", () => ({
  ProductForm: ({
    initialData,
    onOptimistic,
  }: {
    initialData: { name: string };
    onOptimistic: (p: unknown) => void;
  }) => (
    <button type="button" onClick={() => onOptimistic(updated)}>
      Save {initialData.name}
    </button>
  ),
}));

const active = product();
const disabled = product({
  id: "88888888-8888-4888-8888-888888888888",
  name: "Old Service",
  price: 12.5,
  status: "disabled",
});

describe("ProductsTable", () => {
  it("says so when there are no products", () => {
    render(
      <ProductsTable
        data={[]}
        totalPages={1}
        currentPage={1}
        totalCount={0}
        setOptimistic={vi.fn()}
      />,
    );
    expect(screen.getByText("No products found.")).toBeInTheDocument();
  });

  it("lists products with prices, dimming disabled ones", () => {
    render(
      <ProductsTable
        data={[active, disabled]}
        totalPages={3}
        currentPage={2}
        totalCount={12}
        setOptimistic={vi.fn()}
      />,
    );
    expect(screen.getByText("Total Products: 12")).toBeInTheDocument();
    expect(screen.getAllByText("Page 2 of 3")).toHaveLength(2);
    expect(screen.getByText("Consulting")).not.toHaveClass("opacity-50");
    expect(screen.getByText("$100.00")).not.toHaveClass("opacity-50");
    expect(screen.getByText("Old Service")).toHaveClass("opacity-50");
    expect(screen.getByText("$12.50")).toHaveClass("opacity-50");
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("disabled")).toBeInTheDocument();
  });

  it("deletes optimistically", async () => {
    const user = userEvent.setup();
    const setOptimistic = vi.fn();
    render(
      <ProductsTable
        data={[active]}
        totalPages={1}
        currentPage={1}
        totalCount={1}
        setOptimistic={setOptimistic}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: `Delete ${active.id}` }),
    );
    expect(setOptimistic).toHaveBeenCalledWith({
      type: "delete",
      payload: active.id,
    });
  });

  it("edits in a dialog and closes it after saving", async () => {
    const user = userEvent.setup();
    const setOptimistic = vi.fn();
    render(
      <ProductsTable
        data={[active]}
        totalPages={1}
        currentPage={1}
        totalCount={1}
        setOptimistic={setOptimistic}
      />,
    );
    const row = screen.getAllByRole("row")[1];
    await user.click(within(row).getAllByRole("button")[0]);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Edit Product");

    await user.click(
      within(dialog).getByRole("button", { name: "Save Consulting" }),
    );
    expect(setOptimistic).toHaveBeenCalledWith({
      type: "update",
      payload: updated,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
