import "../helpers/dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewInvoiceFallback from "@/components/fallbacks/new-invoice-fallback";

const rows = () => screen.getAllByRole("row").slice(1);
const grandTotal = () =>
  screen.getByText("Grand Total").nextElementSibling?.textContent;

/**
 * Radix Select keeps a hidden native <select> in sync inside a form. The
 * skeleton's selects have no options, so add one and change it the way the
 * browser would (e.g. autofill) to reach the onValueChange handlers.
 */
function changeNativeSelect(select: HTMLSelectElement, value: string) {
  const option = document.createElement("option");
  option.value = value;
  select.appendChild(option);
  fireEvent.change(select, { target: { value } });
}

describe("NewInvoiceFallback", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders as a card with a heading", () => {
    render(<NewInvoiceFallback />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Create New Invoice" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Line Items")).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    expect(grandTotal()).toBe("$0.00");
  });

  it("renders just the form inside a modal", () => {
    const { container } = render(<NewInvoiceFallback isModal />);
    expect(container.firstElementChild?.tagName).toBe("FORM");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create Invoice/ }).parentElement,
    ).toHaveClass("border-t");
  });

  it("shows validation errors when submitted empty", async () => {
    render(<NewInvoiceFallback />);
    await userEvent.click(
      screen.getByRole("button", { name: /Create Invoice/ }),
    );
    expect(
      await screen.findByText("Please fix the following issues:"),
    ).toBeInTheDocument();
    expect(screen.getByText("Please select a customer")).toBeInTheDocument();
  });

  it("moves on to the product error once a customer is chosen", async () => {
    const { container } = render(<NewInvoiceFallback />);
    const [customer, , product] = Array.from(
      container.querySelectorAll("select"),
    );
    changeNativeSelect(customer, "8f14e45f-ceea-4e7a-9f0b-2f6c1b0e6d11");
    // The skeleton's product picker ignores changes, so the item stays empty.
    changeNativeSelect(product, "8f14e45f-ceea-4e7a-9f0b-2f6c1b0e6d12");
    await userEvent.click(
      screen.getByRole("button", { name: /Create Invoice/ }),
    );
    expect(
      await screen.findByText("Please select a product"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Please select a customer"),
    ).not.toBeInTheDocument();
  });

  it("totals line items as quantities and prices change", async () => {
    render(<NewInvoiceFallback />);
    const [qty, price] = within(rows()[0]).getAllByRole("spinbutton");
    await userEvent.clear(qty);
    expect(qty).toHaveValue(null);
    await userEvent.type(qty, "3");
    await userEvent.type(price, "2.5");
    expect(grandTotal()).toBe("$7.50");
    expect(within(rows()[0]).getByText("$7.50")).toBeInTheDocument();

    await userEvent.clear(price);
    fireEvent.blur(price);
    fireEvent.blur(qty);
    expect(price).toHaveValue(null);
    expect(grandTotal()).toBe("$0.00");

    await userEvent.clear(qty);
    fireEvent.blur(qty);
    expect(qty).toHaveValue(null);
  });

  it("adds and removes line items but keeps at least one", async () => {
    render(<NewInvoiceFallback />);
    const removeFirst = () =>
      within(rows()[0]).getAllByRole("button").at(-1) as HTMLElement;
    expect(removeFirst()).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Add Item/ }));
    expect(rows()).toHaveLength(2);
    expect(removeFirst()).toBeEnabled();
    await userEvent.click(removeFirst());
    expect(rows()).toHaveLength(1);
    expect(removeFirst()).toBeDisabled();
  });

  it("ignores status changes in the skeleton", () => {
    const { container } = render(<NewInvoiceFallback />);
    const status = container.querySelectorAll("select")[1];
    changeNativeSelect(status, "paid");
    expect(screen.getAllByRole("combobox")[1]).toHaveTextContent("Draft");
  });
});
