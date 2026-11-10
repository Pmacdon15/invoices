import "../helpers-forms/dom";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceForm } from "@/components/forms/invoice-form";
import type { Customer, PaginatedValue, Product, Result } from "@/dal/types";
import {
  customer,
  fail,
  fullInvoice,
  ORG,
  ok,
  page,
  product,
} from "../helpers-forms/fixtures";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  creating: false,
  updating: false,
  orgId: "org_1" as string | null,
}));
vi.mock("@/mutations/invoices", () => ({
  useCreateInvoice: () => ({ mutate: m.create, isPending: m.creating }),
  useUpdateInvoice: () => ({ mutate: m.update, isPending: m.updating }),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ orgId: m.orgId }) }));
vi.mock("@/components/create-customer-dialog", () => ({
  CreateCustomerDialog: ({ orgId }: { orgId: string }) => (
    <button type="button">Add Customer for {orgId}</button>
  ),
}));
vi.mock("@/components/create-product-dialog", () => ({
  CreateProductDialog: ({ orgId }: { orgId: string }) => (
    <button type="button">Add Product for {orgId}</button>
  ),
}));

const acme = customer();
const globex = customer({
  id: "55555555-5555-4555-8555-555555555555",
  name: "Globex",
});
const consulting = product();
const design = product({
  id: "66666666-6666-4666-8666-666666666666",
  name: "Design",
  price: 40,
});

type Props = Partial<Parameters<typeof InvoiceForm>[0]>;

async function renderForm(props: Props = {}) {
  const customersPromise: Promise<Result<PaginatedValue<Customer>>> =
    props.customersPromise ?? ok(page([acme, globex]));
  const productsPromise: Promise<Result<PaginatedValue<Product>>> =
    props.productsPromise ?? ok(page([consulting, design]));
  await act(async () => {
    render(
      <Suspense fallback={<p>loading</p>}>
        <InvoiceForm
          {...props}
          customersPromise={customersPromise}
          productsPromise={productsPromise}
        />
      </Suspense>,
    );
  });
  await screen.findByText("Line Items");
}

const grandTotal = () =>
  screen.getByText("Grand Total").nextElementSibling?.textContent;

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  option: string,
) {
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: option }));
}

beforeEach(() => {
  m.creating = false;
  m.updating = false;
  m.orgId = ORG;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("InvoiceForm", () => {
  it("renders the create card with one empty line item", async () => {
    await renderForm();
    expect(
      screen.getByRole("heading", { name: "Create New Invoice" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Generate a new invoice by selecting a customer and adding products.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2); // header + 1 item
    expect(grandTotal()).toBe("$0.00");
    expect(screen.queryByText(/^Tax \(/)).not.toBeInTheDocument();
    // A lone line item can't be removed.
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getAllByRole("button").at(-1)).toBeDisabled();
  });

  it("shows the products error instead of the form", async () => {
    await act(async () => {
      render(
        <Suspense>
          <InvoiceForm
            customersPromise={ok(page([acme]))}
            productsPromise={fail("Could not load products")}
          />
        </Suspense>,
      );
    });
    expect(
      await screen.findByText("Could not load products"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Line Items")).not.toBeInTheDocument();
  });

  it("blocks submit and lists the first problem when nothing is chosen", async () => {
    const user = userEvent.setup();
    await renderForm({ isModal: true });
    expect(
      screen.queryByRole("heading", { name: "Create New Invoice" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Invoice" }));

    expect(
      await screen.findByText("Please fix the following issues:"),
    ).toBeInTheDocument();
    expect(screen.getByText("Please select a customer")).toBeInTheDocument();
    expect(m.create).not.toHaveBeenCalled();
  });

  it("fills the price from the product, totals lines with tax, and creates", async () => {
    const user = userEvent.setup();
    await renderForm();
    const [customerSelect, statusSelect, productSelect] =
      screen.getAllByRole("combobox");

    await choose(user, customerSelect, "Globex");
    await choose(user, statusSelect, "Sent");
    await choose(user, productSelect, "Consulting");

    const row = () => screen.getAllByRole("row")[1];
    const [qty, price] = within(row()).getAllByRole("spinbutton");
    expect(price).toHaveValue(100);
    await user.clear(qty);
    await user.type(qty, "3");
    expect(within(row()).getByText("$300.00")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("0.00"), "10");
    expect(screen.getByText("Tax (10%):")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(grandTotal()).toBe("$330.00");

    await user.click(screen.getByRole("button", { name: "Create Invoice" }));

    await waitFor(() =>
      expect(m.create).toHaveBeenCalledWith({
        customer_id: globex.id,
        status: "sent",
        tax_rate: 10,
        total_override: null,
        items: [{ product_id: consulting.id, quantity: 3, unit_price: 100 }],
      }),
    );
    expect(m.update).not.toHaveBeenCalled();
  });

  it("adds and removes line items", async () => {
    const user = userEvent.setup();
    await renderForm();
    await user.click(screen.getByRole("button", { name: /Add Item/ }));
    expect(screen.getAllByRole("row")).toHaveLength(3);

    const second = screen.getAllByRole("row")[2];
    const removeButtons = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((r) => within(r).getAllByRole("button").at(-1));
    for (const button of removeButtons()) expect(button).toBeEnabled();

    await user.click(within(second).getAllByRole("button").at(-1) as never);
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("treats a cleared number as zero", async () => {
    const user = userEvent.setup();
    await renderForm();
    const row = screen.getAllByRole("row")[1];
    const [qty, price] = within(row).getAllByRole("spinbutton");
    const tax = screen.getByPlaceholderText("0.00");

    await user.type(price, "5");
    await user.clear(qty);
    expect(qty).toHaveValue(null);
    await user.tab();
    expect(qty).toHaveValue(null);
    await user.clear(price);
    await user.tab();
    expect(price).toHaveValue(null);

    await user.type(tax, "5");
    await user.clear(tax);
    expect(tax).toHaveValue(null);
    expect(grandTotal()).toBe("$0.00");

    // Blur on a filled-in value keeps it.
    await user.type(qty, "2");
    await user.tab();
    expect(qty).toHaveValue(2);
  });

  it("ignores a product id that isn't in the list", async () => {
    // Select an item whose value has no matching product: only happens
    // if the list changes under the form, so drive it via a stale option.
    const user = userEvent.setup();
    await renderForm({
      productsPromise: ok(
        page([consulting], { totalCount: 1, data: [consulting] }),
      ),
    });
    const productSelect = screen.getAllByRole("combobox")[2];
    await choose(user, productSelect, "Consulting");
    const price = within(screen.getAllByRole("row")[1]).getAllByRole(
      "spinbutton",
    )[1];
    expect(price).toHaveValue(100);
  });

  it("offers to add a customer or product when there are none", async () => {
    await renderForm({
      customersPromise: ok(page<Customer>([])),
      productsPromise: ok(page<Product>([])),
    });
    expect(screen.getByText(`Add Customer for ${ORG}`)).toBeInTheDocument();
    expect(screen.getByText(`Add Product for ${ORG}`)).toBeInTheDocument();
  });

  it("treats a customers error like having none", async () => {
    await renderForm({ customersPromise: fail("down") });
    expect(screen.getByText(`Add Customer for ${ORG}`)).toBeInTheDocument();
  });

  it("offers nothing to add without an active organization", async () => {
    m.orgId = null;
    await renderForm({
      customersPromise: ok(page<Customer>([])),
      productsPromise: ok(page<Product>([])),
    });
    expect(screen.queryByText(/Add Customer for/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add Product for/)).not.toBeInTheDocument();
  });

  it("creates optimistically with the computed total", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-03-01") });
    const user = userEvent.setup();
    const onOptimistic = vi.fn();
    await renderForm({ onOptimistic });
    const [customerSelect, , productSelect] = screen.getAllByRole("combobox");
    await choose(user, customerSelect, "Acme Corp");
    await choose(user, productSelect, "Design");
    await user.type(screen.getByPlaceholderText("0.00"), "50");
    await user.click(screen.getByRole("button", { name: "Create Invoice" }));

    await waitFor(() => expect(onOptimistic).toHaveBeenCalledOnce());
    expect(onOptimistic).toHaveBeenCalledWith({
      id: expect.stringMatching(/^opt-/),
      customer_id: acme.id,
      org_id: ORG,
      status: "draft",
      tax_rate: 50,
      total: 60,
      total_override: null,
      created_at: "2026-03-01T00:00:00.000Z",
      customer: acme,
    });
    expect(m.create).toHaveBeenCalledOnce();
  });

  it("edits an existing invoice", async () => {
    const user = userEvent.setup();
    const existing = fullInvoice({ tax_rate: 5, status: "paid" });
    await renderForm({ initialData: existing });

    expect(
      screen.getByRole("heading", { name: "Edit Invoice" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Update the invoice details below."),
    ).toBeInTheDocument();
    expect(grandTotal()).toBe("$210.00");

    await user.click(screen.getByRole("button", { name: "Update Invoice" }));
    await waitFor(() =>
      expect(m.update).toHaveBeenCalledWith({
        id: existing.id,
        customer_id: existing.customer_id,
        status: "paid",
        tax_rate: 5,
        total_override: null,
        items: [
          {
            product_id: consulting.id,
            description: null,
            quantity: 2,
            unit_price: 100,
          },
        ],
      }),
    );
    expect(m.create).not.toHaveBeenCalled();
  });

  it("edits optimistically, keeping the invoice's id and date", async () => {
    const user = userEvent.setup();
    const onOptimistic = vi.fn();
    const existing = fullInvoice({
      // A null tax rate from older rows still counts as zero.
      tax_rate: null as unknown as number,
    });
    await renderForm({ initialData: existing, onOptimistic });
    await user.click(screen.getByRole("button", { name: "Update Invoice" }));

    await waitFor(() => expect(onOptimistic).toHaveBeenCalledOnce());
    expect(onOptimistic).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existing.id,
        created_at: existing.created_at,
        tax_rate: 0,
        total: 200,
      }),
    );
    expect(m.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: existing.id }),
    );
  });

  it("bills a manual total instead of the computed one", async () => {
    const user = userEvent.setup();
    const onOptimistic = vi.fn();
    const existing = fullInvoice({ tax_rate: 5 });
    await renderForm({ initialData: existing, onOptimistic });
    const override = screen.getByLabelText("Manual Total (optional)");
    expect(override).toHaveValue(null);
    await user.type(override, "150");
    expect(grandTotal()).toBe("$150.00");
    await user.click(screen.getByRole("button", { name: "Update Invoice" }));
    await waitFor(() =>
      expect(m.update).toHaveBeenCalledWith(
        expect.objectContaining({ total_override: 150 }),
      ),
    );
    expect(onOptimistic).toHaveBeenCalledWith(
      expect.objectContaining({ total: 150, total_override: 150 }),
    );
    await user.clear(override);
    expect(grandTotal()).toBe("$210.00");
  });

  it("keeps an invoice's one-off items and manual total when editing", async () => {
    const user = userEvent.setup();
    const existing = fullInvoice({
      total_override: 99,
      items: [
        {
          ...fullInvoice().items[0],
          product_id: null,
          description: "Call-out fee",
          product: null,
        },
      ],
    });
    await renderForm({ initialData: existing });
    expect(screen.getByText("Call-out fee")).toBeInTheDocument();
    expect(screen.getByText("(one-off)")).toBeInTheDocument();
    expect(screen.getByLabelText("Manual Total (optional)")).toHaveValue(99);
    await user.click(screen.getByRole("button", { name: "Update Invoice" }));
    await waitFor(() =>
      expect(m.update).toHaveBeenCalledWith(
        expect.objectContaining({
          total_override: 99,
          items: [
            {
              product_id: null,
              description: "Call-out fee",
              quantity: 2,
              unit_price: 100,
            },
          ],
        }),
      ),
    );
  });

  it("asks for a product on an item that has neither product nor description", async () => {
    await renderForm({
      initialData: fullInvoice({
        items: [
          {
            ...fullInvoice().items[0],
            product_id: null,
            description: null,
            product: null,
          },
        ],
      }),
    });
    expect(screen.getByText("Select product")).toBeInTheDocument();
  });

  it("shows a disabled spinner button while saving", async () => {
    m.creating = true;
    await renderForm();
    const submit = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("type") === "submit");
    expect(submit).toBeDisabled();
    expect(submit).not.toHaveTextContent("Create Invoice");
  });
});
