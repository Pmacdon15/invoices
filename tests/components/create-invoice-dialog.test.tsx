import "./helpers-forms/dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreateInvoiceDialog } from "@/components/create-invoice-dialog";
import { customer, invoice, ok, page, product } from "./helpers-forms/fixtures";

const created = invoice();
const formProps = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
vi.mock("@/components/forms/invoice-form", () => ({
  InvoiceForm: (props: {
    isModal: boolean;
    onOptimistic: (i: unknown) => void;
  }) => {
    formProps.current = props;
    return (
      <button type="button" onClick={() => props.onOptimistic(created)}>
        Fake create
      </button>
    );
  },
}));

describe("CreateInvoiceDialog", () => {
  it("passes the data to the form, hands the invoice up and closes", async () => {
    const user = userEvent.setup();
    const onOptimistic = vi.fn();
    const customersPromise = ok(page([customer()]));
    const productsPromise = ok(page([product()]));
    render(
      <CreateInvoiceDialog
        customersPromise={customersPromise}
        productsPromise={productsPromise}
        onOptimistic={onOptimistic}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Create Invoice/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Create New Invoice");
    expect(formProps.current).toMatchObject({
      isModal: true,
      customersPromise,
      productsPromise,
    });

    await user.click(screen.getByRole("button", { name: "Fake create" }));
    expect(onOptimistic).toHaveBeenCalledWith(created);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
