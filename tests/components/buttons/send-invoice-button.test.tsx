import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({
  send: { mutate: vi.fn(), isPending: false },
}));
vi.mock("@/mutations/invoices", () => ({ useSendInvoice: () => send }));

import { SendInvoiceButton } from "@/components/buttons/send-invoice-button";

describe("SendInvoiceButton", () => {
  beforeEach(() => {
    send.isPending = false;
  });

  it("sends a draft invoice", async () => {
    render(<SendInvoiceButton invoiceId="inv-1" currentStatus="draft" />);
    const button = screen.getByRole("button", { name: "Send Invoice" });
    expect(button).toBeEnabled();
    expect(button).toHaveClass("bg-primary");
    await userEvent.click(button);
    expect(send.mutate).toHaveBeenCalledWith("inv-1");
  });

  it.each([
    ["sent", "Sent"],
    ["paid", "Paid"],
  ] as const)("is disabled once %s", (status, label) => {
    render(<SendInvoiceButton invoiceId="inv-1" currentStatus={status} />);
    const button = screen.getByRole("button", { name: label });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("border");
  });

  it("shows progress while sending", () => {
    send.isPending = true;
    render(<SendInvoiceButton invoiceId="inv-1" currentStatus="draft" />);
    const button = screen.getByRole("button", { name: "Sending..." });
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).toBeTruthy();
  });
});
