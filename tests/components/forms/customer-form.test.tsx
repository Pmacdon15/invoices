import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerForm } from "@/components/forms/customer-form";
import { customer, ORG } from "../helpers-forms/fixtures";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  creating: false,
  updating: false,
}));
vi.mock("@/mutations/customers", () => ({
  useCreateCustomer: () => ({ mutate: m.create, isPending: m.creating }),
  useUpdateCustomer: () => ({ mutate: m.update, isPending: m.updating }),
}));

const blankContact = {
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
};

beforeEach(() => {
  m.creating = false;
  m.updating = false;
});

describe("CustomerForm", () => {
  it("renders as a card with the add title by default", () => {
    render(<CustomerForm orgId={ORG} />);
    expect(screen.getByText("Add New Customer")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enter the customer's details to add them to your database.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Customer" }),
    ).toBeInTheDocument();
  });

  it("creates an active customer with what was typed", async () => {
    const user = userEvent.setup();
    const onOptimistic = vi.fn();
    render(<CustomerForm orgId={ORG} onOptimistic={onOptimistic} isModal />);

    expect(screen.queryByText("Add New Customer")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Company Name"), "Globex");
    await user.type(screen.getByLabelText("Email Address"), "hi@globex.com");
    await user.click(screen.getByRole("button", { name: "Save Customer" }));

    await waitFor(() =>
      expect(m.create).toHaveBeenCalledWith({
        name: "Globex",
        email: "hi@globex.com",
        ...blankContact,
        status: "active",
      }),
    );
    expect(onOptimistic).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Globex",
        email: "hi@globex.com",
        org_id: ORG,
        status: "active",
        id: expect.any(String),
      }),
    );
    expect(m.update).not.toHaveBeenCalled();
  });

  it("creates without an optimistic callback", async () => {
    const user = userEvent.setup();
    render(<CustomerForm orgId={ORG} />);
    await user.type(screen.getByLabelText("Company Name"), "Initech");
    await user.click(screen.getByRole("button", { name: "Save Customer" }));
    await waitFor(() => expect(m.create).toHaveBeenCalledOnce());
  });

  it("edits an existing customer, keeping its id and status", async () => {
    const user = userEvent.setup();
    const existing = customer({ status: "disabled" });
    const onOptimistic = vi.fn();
    render(
      <CustomerForm
        orgId={ORG}
        initialData={existing}
        onOptimistic={onOptimistic}
      />,
    );

    expect(screen.getByText("Edit Customer")).toBeInTheDocument();
    expect(
      screen.getByText("Update the customer's details below."),
    ).toBeInTheDocument();
    const name = screen.getByLabelText("Company Name");
    expect(name).toHaveValue("Acme Corp");
    await user.clear(name);
    await user.type(name, "Acme Inc");
    await user.click(screen.getByRole("button", { name: "Update Customer" }));

    await waitFor(() =>
      expect(m.update).toHaveBeenCalledWith({
        name: "Acme Inc",
        email: existing.email,
        ...blankContact,
        id: existing.id,
        status: "disabled",
      }),
    );
    expect(onOptimistic).toHaveBeenCalledWith({
      name: "Acme Inc",
      email: existing.email,
      ...blankContact,
      id: existing.id,
      org_id: ORG,
      status: "disabled",
    });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("saves phone and address, and shows an existing customer's", async () => {
    const user = userEvent.setup();
    render(<CustomerForm orgId={ORG} />);
    await user.type(screen.getByLabelText("Company Name"), "Globex");
    await user.type(screen.getByLabelText("Email Address"), "hi@globex.com");
    await user.type(screen.getByLabelText("Phone"), "403-555-0100");
    await user.type(screen.getByLabelText("Address"), "1 Main St");
    await user.type(screen.getByLabelText("Address Line 2"), "Suite 4");
    await user.type(screen.getByLabelText("City"), "Calgary");
    await user.type(screen.getByLabelText("Province / State"), "AB");
    await user.type(screen.getByLabelText("Postal Code"), "T2P 1J9");
    await user.type(screen.getByLabelText("Country"), "Canada");
    expect(screen.getByLabelText("Phone")).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText("City")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Save Customer" }));
    await waitFor(() =>
      expect(m.create).toHaveBeenCalledWith({
        name: "Globex",
        email: "hi@globex.com",
        phone: "403-555-0100",
        address_line1: "1 Main St",
        address_line2: "Suite 4",
        city: "Calgary",
        region: "AB",
        postal_code: "T2P 1J9",
        country: "Canada",
        status: "active",
      }),
    );
  });

  it("fills in an existing customer's phone and address", () => {
    render(
      <CustomerForm
        orgId={ORG}
        initialData={customer({ phone: "555", city: "Banff", country: null })}
      />,
    );
    expect(screen.getByLabelText("Phone")).toHaveValue("555");
    expect(screen.getByLabelText("City")).toHaveValue("Banff");
    expect(screen.getByLabelText("Country")).toHaveValue("");
  });

  it("shows a disabled saving button while a mutation runs", () => {
    m.updating = true;
    render(<CustomerForm orgId={ORG} />);
    const button = screen.getByRole("button", { name: /Saving/ });
    expect(button).toBeDisabled();
  });
});
