import "./helpers-forms/dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceStatusUpdater } from "@/components/invoice-status-updater";

const m = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
vi.mock("@/mutations/invoices", () => ({
  useUpdateInvoiceStatus: () => m,
}));

beforeEach(() => {
  m.isPending = false;
});

describe("InvoiceStatusUpdater", () => {
  it("shows the current status and saves a new one", async () => {
    const user = userEvent.setup();
    render(<InvoiceStatusUpdater invoiceId="inv-1" currentStatus="draft" />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveTextContent("Draft");
    await user.click(select);
    await user.click(screen.getByRole("option", { name: "Paid" }));

    expect(m.mutate).toHaveBeenCalledWith({ id: "inv-1", status: "paid" });
  });

  it("is disabled while an update is in flight", () => {
    m.isPending = true;
    render(<InvoiceStatusUpdater invoiceId="inv-1" currentStatus="sent" />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
