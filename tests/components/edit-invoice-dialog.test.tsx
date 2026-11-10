import "./helpers-forms/dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditInvoiceDialog } from "@/components/edit-invoice-dialog";
import {
  customer,
  fullInvoice,
  ok,
  page,
  product,
} from "./helpers-forms/fixtures";

const formProps = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
vi.mock("@/components/forms/invoice-form", () => ({
  InvoiceForm: (props: { onOptimistic: () => void }) => {
    formProps.current = props;
    return (
      <button type="button" onClick={() => props.onOptimistic()}>
        Fake update
      </button>
    );
  },
}));

describe("EditInvoiceDialog", () => {
  it("opens the form with the invoice and closes once saved", async () => {
    const user = userEvent.setup();
    const existing = fullInvoice();
    const customersPromise = ok(page([customer()]));
    const productsPromise = ok(page([product()]));
    render(
      <EditInvoiceDialog
        invoice={existing}
        customersPromise={customersPromise}
        productsPromise={productsPromise}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Edit Invoice");
    expect(formProps.current).toMatchObject({
      isModal: true,
      initialData: existing,
      customersPromise,
      productsPromise,
    });

    await user.click(screen.getByRole("button", { name: "Fake update" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
