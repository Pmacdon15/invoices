import "./helpers-forms/dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreateCustomerDialog } from "@/components/create-customer-dialog";
import { customer, ORG } from "./helpers-forms/fixtures";

const created = customer({ name: "New Co" });
vi.mock("@/components/forms/customer-form", () => ({
  CustomerForm: ({
    orgId,
    isModal,
    onOptimistic,
  }: {
    orgId: string;
    isModal: boolean;
    onOptimistic: (c: unknown) => void;
  }) => (
    <button type="button" onClick={() => onOptimistic(created)}>
      Fake save {orgId} {String(isModal)}
    </button>
  ),
}));

describe("CreateCustomerDialog", () => {
  it("opens the form, hands the new customer up and closes", async () => {
    const user = userEvent.setup();
    const onOptimistic = vi.fn();
    render(<CreateCustomerDialog orgId={ORG} onOptimistic={onOptimistic} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Add New Customer");

    await user.click(
      screen.getByRole("button", { name: `Fake save ${ORG} true` }),
    );
    expect(onOptimistic).toHaveBeenCalledWith(created);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes after saving without an optimistic callback", async () => {
    const user = userEvent.setup();
    render(<CreateCustomerDialog orgId={ORG} />);
    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    await user.click(screen.getByRole("button", { name: /Fake save/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
