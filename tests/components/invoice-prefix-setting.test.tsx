import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoicePrefixSetting } from "@/components/invoice-prefix-setting";
import type { OrgSettings, Result } from "@/dal/types";

const m = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  orgRole: "org:admin" as string | null,
}));
vi.mock("@/mutations/org-settings", () => ({
  useUpdateInvoicePrefix: () => ({ mutate: m.mutate, isPending: m.isPending }),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ orgRole: m.orgRole }) }));

const settings: OrgSettings = {
  org_id: "org_1",
  invoice_prefix: "INV",
  last_invoice_number: 41,
};

async function renderSetting(
  result: Result<OrgSettings> = { data: settings, error: null },
) {
  await act(async () => {
    render(
      <Suspense>
        <InvoicePrefixSetting settingsPromise={Promise.resolve(result)} />
      </Suspense>,
    );
  });
}

async function open() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Numbering" }));
  return user;
}

beforeEach(() => {
  m.isPending = false;
  m.orgRole = "org:admin";
});

describe("InvoicePrefixSetting", () => {
  it("renders nothing when the settings can't load", async () => {
    await renderSetting({ data: null, error: "No org" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets an admin change the prefix, previewing the next number", async () => {
    await renderSetting();
    const user = await open();
    const input = screen.getByLabelText("Invoice number prefix");
    expect(input).toHaveValue("INV");
    expect(screen.getByText("INV-0042")).toBeInTheDocument();

    await user.clear(input);
    // A blank prefix previews with the saved one.
    expect(screen.getByText("INV-0042")).toBeInTheDocument();
    await user.type(input, " ACME ");
    expect(screen.getByText("ACME-0042")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(m.mutate).toHaveBeenCalledWith("ACME");
  });

  it("disables saving while it saves", async () => {
    m.isPending = true;
    await renderSetting();
    await open();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("only shows the prefix to other members", async () => {
    m.orgRole = "org:member";
    await renderSetting();
    await open();
    expect(screen.getByLabelText("Invoice number prefix")).toBeDisabled();
    expect(
      screen.getByText("Only an organization admin can change the prefix."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
  });
});
