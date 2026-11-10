import "./helpers-forms/dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreateProductDialog } from "@/components/create-product-dialog";
import { ORG, product } from "./helpers-forms/fixtures";

const created = product({ name: "Widget" });
vi.mock("@/components/forms/product-form", () => ({
  ProductForm: ({
    orgId,
    isModal,
    onOptimistic,
  }: {
    orgId: string;
    isModal: boolean;
    onOptimistic: (p: unknown) => void;
  }) => (
    <button type="button" onClick={() => onOptimistic(created)}>
      Fake save {orgId} {String(isModal)}
    </button>
  ),
}));

describe("CreateProductDialog", () => {
  it("opens the form, hands the new product up and closes", async () => {
    const user = userEvent.setup();
    const onOptimistic = vi.fn();
    render(<CreateProductDialog orgId={ORG} onOptimistic={onOptimistic} />);

    await user.click(screen.getByRole("button", { name: /Add Product/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Add New Product");

    await user.click(
      screen.getByRole("button", { name: `Fake save ${ORG} true` }),
    );
    expect(onOptimistic).toHaveBeenCalledWith(created);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes after saving without an optimistic callback", async () => {
    const user = userEvent.setup();
    render(<CreateProductDialog orgId={ORG} />);
    await user.click(screen.getByRole("button", { name: /Add Product/ }));
    await user.click(screen.getByRole("button", { name: /Fake save/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
