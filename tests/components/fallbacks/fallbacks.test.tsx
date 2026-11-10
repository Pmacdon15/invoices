import "../helpers/dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CustomersFallback from "@/components/fallbacks/customers-fallback";
import InvoicesFallback from "@/components/fallbacks/invoices-fallback";
import ProductsFallback from "@/components/fallbacks/products-fallback";

describe.each([
  ["customers", CustomersFallback, "Add Customer", "Total Customers: --"],
  ["products", ProductsFallback, "Add Product", "Total Products: --"],
  ["invoices", InvoicesFallback, "Create Invoice", "Total Invoices: --"],
] as const)("%s fallback", (name, Fallback, action, total) => {
  it("shows a spinner, a disabled action and placeholder counts", () => {
    render(<Fallback />);
    expect(screen.getByText(`Loading ${name}...`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: action })).toBeDisabled();
    expect(screen.getByText(total)).toBeInTheDocument();
    expect(screen.getByText("Page -- of --")).toBeInTheDocument();
  });
});

describe("invoices fallback", () => {
  it("shows the status filter set to all", () => {
    render(<InvoicesFallback />);
    expect(screen.getByRole("combobox")).toHaveTextContent("All Statuses");
  });
});
