import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InvoicesTable } from "@/components/tables/invoices-table";
import { invoice } from "../helpers-forms/fixtures";

// `ViewTransition` ships only in the React canary that Next bundles; the
// npm build vitest loads doesn't export it, so render its children as is.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    ViewTransition: ({ children }: { children: React.ReactNode }) => children,
  };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/invoices",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/buttons/delete-invoice-button", () => ({
  default: ({
    rowId,
    setOptimisticInvoices,
  }: {
    rowId: string;
    setOptimisticInvoices: (id: string) => void;
  }) => (
    <button type="button" onClick={() => setOptimisticInvoices(rowId)}>
      Delete {rowId}
    </button>
  ),
}));

const saved = invoice({ status: "paid", total: 1234.5 });
const pending = invoice({
  id: "opt-abcdef12-0000",
  customer: undefined,
  created_at: "",
  status: "draft",
  total: 10,
});

describe("InvoicesTable", () => {
  it("says so when there are no invoices", () => {
    render(
      <InvoicesTable
        data={[]}
        totalPages={1}
        currentPage={1}
        totalCount={0}
        setOptimistic={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No invoices found for this period."),
    ).toBeInTheDocument();
  });

  it("lists a saved invoice with links, date, total and status", () => {
    render(
      <InvoicesTable
        data={[saved]}
        totalPages={4}
        currentPage={2}
        totalCount={31}
        setOptimistic={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: "#33333333" });
    expect(link).toHaveAttribute("href", `/invoices/${saved.id}`);
    expect(link).not.toHaveClass("opacity-50");
    expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("billing@acme.com")).toBeInTheDocument();
    expect(
      screen.getByText(new Date(saved.created_at).toLocaleDateString()),
    ).toBeInTheDocument();
    expect(screen.getByText("$1,234.50")).toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("Total Invoices: 31")).toBeInTheDocument();
    expect(screen.getAllByText("Page 2 of 4")).toHaveLength(2);
  });

  it("shows an overdue sent invoice as overdue", () => {
    render(
      <InvoicesTable
        data={[
          invoice({ status: "sent", overdue: true }),
          invoice({ id: "44444444-0000", status: "sent", overdue: false }),
        ]}
        totalPages={1}
        currentPage={1}
        totalCount={2}
        setOptimistic={vi.fn()}
      />,
    );
    const badge = screen.getByText("overdue");
    expect(badge).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByText("sent")).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("marks an optimistic invoice as saving", () => {
    render(
      <InvoicesTable
        data={[pending]}
        totalPages={1}
        currentPage={1}
        totalCount={1}
        setOptimistic={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: "#opt-abcd" });
    expect(link).toHaveAttribute("href", "#");
    expect(link).toHaveClass("opacity-50");
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("deletes optimistically", async () => {
    const user = userEvent.setup();
    const setOptimistic = vi.fn();
    render(
      <InvoicesTable
        data={[saved]}
        totalPages={1}
        currentPage={1}
        totalCount={1}
        setOptimistic={setOptimistic}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: `Delete ${saved.id}` }),
    );
    expect(setOptimistic).toHaveBeenCalledWith({
      type: "delete",
      payload: saved.id,
    });
  });
});
