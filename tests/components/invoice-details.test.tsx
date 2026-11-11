import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceDetails } from "@/components/invoice-details";
import type { FullInvoice } from "@/dal/types";
import {
  customer,
  fail,
  fullInvoice,
  ok,
  page,
  product,
} from "./helpers-forms/fixtures";

const clerk = vi.hoisted(() => ({
  has: vi.fn(),
  organization: null as null | {
    name: string;
    imageUrl?: string;
    hasImage?: boolean;
  },
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ has: clerk.has }),
  useOrganization: () => ({ organization: clerk.organization }),
}));
vi.mock("next/image", () => ({
  // biome-ignore lint/performance/noImgElement: stand-in for next/image
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
vi.mock("@/components/buttons/send-invoice-button", () => ({
  SendInvoiceButton: ({ currentStatus }: { currentStatus: string }) => (
    <span>Send ({currentStatus})</span>
  ),
}));
vi.mock("@/components/buttons/download-pdf-button", () => ({
  DownloadPDFButton: ({ invoiceId }: { invoiceId: string }) => (
    <span>PDF {invoiceId}</span>
  ),
}));
vi.mock("@/components/edit-invoice-dialog", () => ({
  EditInvoiceDialog: () => <span>Edit dialog</span>,
}));
vi.mock("@/components/invoice-status-updater", () => ({
  InvoiceStatusUpdater: ({ currentStatus }: { currentStatus: string }) => (
    <span>Status {currentStatus}</span>
  ),
}));

async function renderDetails(invoicePromise: Promise<unknown>) {
  await act(async () => {
    render(
      <Suspense>
        <InvoiceDetails
          invoicePromise={invoicePromise as Promise<never>}
          customersPromise={ok(page([customer()]))}
          productsPromise={ok(page([product()]))}
        />
      </Suspense>,
    );
  });
}

beforeEach(() => {
  clerk.has.mockReturnValue(false);
  clerk.organization = null;
});

describe("InvoiceDetails", () => {
  it("shows the load error", async () => {
    await renderDetails(fail("Not your invoice"));
    expect(await screen.findByText("Not your invoice")).toBeInTheDocument();
  });

  it("says the invoice wasn't found when there is no data", async () => {
    await renderDetails(Promise.resolve({ data: null, error: null }));
    expect(await screen.findByText("Invoice not found")).toBeInTheDocument();
  });

  it("shows the invoice without tax lines or send button", async () => {
    const inv = fullInvoice({ total: 200, status: "sent" });
    await renderDetails(ok(inv));

    expect(
      await screen.findByText(`ID: ${inv.id}`, { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("billing@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Edit dialog")).toBeInTheDocument();
    expect(screen.getByText(`PDF ${inv.id}`)).toBeInTheDocument();
    expect(screen.getByText("Status sent")).toBeInTheDocument();
    expect(screen.getByText("Jan 15, 2026")).toBeInTheDocument();
    expect(screen.queryByText(/^Send/)).not.toBeInTheDocument();
    expect(screen.queryByText("Subtotal")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // Mobile list and desktop table both show the line and total.
    expect(screen.getAllByText("Consulting")).toHaveLength(2);
    expect(screen.getAllByText("$200.00").length).toBeGreaterThanOrEqual(4);
    expect(clerk.has).toHaveBeenCalledWith({ feature: "send_email" });
  });

  it("flags an overdue invoice next to its status", async () => {
    await renderDetails(
      ok(
        fullInvoice({ status: "sent", due_date: "2026-01-30", overdue: true }),
      ),
    );
    expect(await screen.findByTestId("overdue-badge")).toHaveTextContent(
      "Overdue",
    );
    expect(screen.getByText("Status sent")).toBeInTheDocument();
  });

  it("shows no overdue badge for an invoice that isn't overdue", async () => {
    await renderDetails(ok(fullInvoice({ status: "paid", overdue: true })));
    expect(await screen.findByText("Status paid")).toBeInTheDocument();
    expect(screen.queryByTestId("overdue-badge")).not.toBeInTheDocument();
  });

  it("adds tax lines, the send button and the org logo when available", async () => {
    clerk.has.mockReturnValue(true);
    clerk.organization = {
      name: "My Shop",
      imageUrl: "https://img.clerk.com/logo.png",
      hasImage: true,
    };
    const inv: FullInvoice = fullInvoice({ tax_rate: 10, total: 220 });
    await renderDetails(ok(inv));

    expect(await screen.findByText("Send (draft)")).toBeInTheDocument();
    expect(screen.getByText("My Shop")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Organization Logo" }),
    ).toHaveAttribute("src", "https://img.clerk.com/logo.png");
    expect(screen.getAllByText("Tax (10%)")).toHaveLength(2);
    expect(screen.getAllByText("Subtotal")).toHaveLength(2);
    expect(screen.getAllByText("$20.00")).toHaveLength(2);
    expect(screen.getAllByText("$220.00").length).toBeGreaterThanOrEqual(3);
  });

  it("hides the logo when the organization only has a default image", async () => {
    clerk.organization = {
      name: "My Shop",
      imageUrl: "https://img.clerk.com/default.png",
      hasImage: false,
    };
    await renderDetails(ok(fullInvoice()));
    expect(await screen.findByText("My Shop")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the customer's phone and address, one-off items and a manual total", async () => {
    const base = fullInvoice();
    await renderDetails(
      ok(
        fullInvoice({
          total: 150,
          total_override: 150,
          customer: customer({
            phone: "403-555-0100",
            address_line1: "1 Main St",
            city: "Calgary",
            region: "AB",
            postal_code: "T2P 1J9",
            country: "Canada",
          }),
          items: [
            ...base.items,
            {
              ...base.items[0],
              id: "item-2",
              product_id: null,
              description: "Call-out fee",
              product: null,
            },
          ],
        }),
      ),
    );
    expect(await screen.findByText("403-555-0100")).toBeInTheDocument();
    expect(screen.getByText("1 Main St")).toBeInTheDocument();
    expect(screen.getByText("Calgary, AB T2P 1J9")).toBeInTheDocument();
    expect(screen.getByText("Canada")).toBeInTheDocument();
    expect(screen.getAllByText("Call-out fee")).toHaveLength(2);
    expect(screen.getByText("One-off")).toBeInTheDocument();
    expect(screen.getByText("One-off item")).toBeInTheDocument();
    expect(
      screen.getByText("Manual total (line items and tax not used)"),
    ).toBeInTheDocument();
  });
});
