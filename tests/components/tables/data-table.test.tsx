import type { ColumnDef } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/tables/data-table";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  params: "",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  usePathname: () => "/customers",
  useSearchParams: () => new URLSearchParams(nav.params),
}));

type Row = { name: string };
const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  {
    id: "group",
    header: "Group",
    columns: [{ id: "child", header: "Child", cell: () => "x" }],
  },
];

beforeEach(() => {
  nav.params = "";
});

describe("DataTable", () => {
  it("renders headers and rows", () => {
    render(
      <DataTable
        columns={columns}
        data={[{ name: "Ada" }, { name: "Bob" }]}
        currentPage={1}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Group" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Bob" })).toBeInTheDocument();
    // totalPages defaults to 1, so both buttons are off.
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows an empty row with no data", () => {
    render(<DataTable columns={columns} data={[]} currentPage={1} />);
    expect(screen.getByRole("cell", { name: "No results." })).toHaveAttribute(
      "colSpan",
      "2",
    );
  });

  it("pages forward and back, keeping other search params", async () => {
    const user = userEvent.setup();
    nav.params = "query=acme&page=2";
    render(
      <DataTable
        columns={columns}
        data={[{ name: "Ada" }]}
        currentPage={2}
        totalPages={3}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(nav.push).toHaveBeenLastCalledWith("/customers?query=acme&page=3");
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(nav.push).toHaveBeenLastCalledWith("/customers?query=acme&page=1");
  });

  it("can't go past the last page", () => {
    render(
      <DataTable
        columns={columns}
        data={[{ name: "Ada" }]}
        currentPage={3}
        totalPages={3}
      />,
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });
});
