import "../helpers-forms/dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomersTable } from "@/components/tables/customer-table";
import { customer } from "../helpers-forms/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/customers",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/buttons/delete-customer-button", () => ({
  default: ({
    rowId,
    setOptimisticCustomers,
  }: {
    rowId: string;
    setOptimisticCustomers: (id: string) => void;
  }) => (
    <button type="button" onClick={() => setOptimisticCustomers(rowId)}>
      Delete {rowId}
    </button>
  ),
}));
const updated = customer({ name: "Renamed" });
vi.mock("@/components/forms/customer-form", () => ({
  CustomerForm: ({
    initialData,
    onOptimistic,
  }: {
    initialData: { name: string };
    onOptimistic: (c: unknown) => void;
  }) => (
    <button type="button" onClick={() => onOptimistic(updated)}>
      Save {initialData.name}
    </button>
  ),
}));

const active = customer();
const disabled = customer({
  id: "77777777-7777-4777-8777-777777777777",
  name: "Old Co",
  email: "old@co.com",
  status: "disabled",
});

describe("CustomersTable", () => {
  it("says so when the page is empty", () => {
    render(
      <CustomersTable
        data={[]}
        totalPages={1}
        currentPage={1}
        totalCount={0}
        setOptimistic={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No customers found on this page."),
    ).toBeInTheDocument();
  });

  it("lists customers, dimming disabled ones", () => {
    render(
      <CustomersTable
        data={[active, disabled]}
        totalPages={2}
        currentPage={1}
        totalCount={7}
        setOptimistic={vi.fn()}
      />,
    );
    expect(screen.getByText("Total Customers: 7")).toBeInTheDocument();
    expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2);
    expect(screen.getByText("Acme Corp")).not.toHaveClass("opacity-50");
    expect(screen.getByText("billing@acme.com")).not.toHaveClass("opacity-50");
    expect(screen.getByText("Old Co")).toHaveClass("opacity-50");
    expect(screen.getByText("old@co.com")).toHaveClass("opacity-50");
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("disabled")).toBeInTheDocument();
  });

  it("deletes optimistically", async () => {
    const user = userEvent.setup();
    const setOptimistic = vi.fn();
    render(
      <CustomersTable
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
      <CustomersTable
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
    expect(dialog).toHaveTextContent("Edit Customer");

    await user.click(
      within(dialog).getByRole("button", { name: "Save Acme Corp" }),
    );
    expect(setOptimistic).toHaveBeenCalledWith({
      type: "update",
      payload: updated,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
