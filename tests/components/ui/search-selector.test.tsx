import "../helpers/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: { current: new URLSearchParams() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams.current,
}));

import { SearchSelector } from "@/components/ui/search-selector";

const fetchMock = vi.fn();

function respond(data: unknown) {
  fetchMock.mockResolvedValue({ json: async () => data });
}

function renderSelector(props: Partial<Parameters<typeof SearchSelector>[0]>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <SearchSelector apiEndpoint="/api/customers/search" {...props} />,
    { wrapper },
  );
}

describe("SearchSelector", () => {
  beforeEach(() => {
    searchParams.current = new URLSearchParams();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts from the query in the URL and uses the default placeholder", () => {
    searchParams.current = new URLSearchParams("query=acme");
    renderSelector({});
    expect(screen.getByPlaceholderText("Search...")).toHaveValue("acme");
  });

  it("searches the endpoint after typing and lists customers", async () => {
    respond({
      data: [
        { id: "1", name: "Acme", email: "a@acme.test" },
        { id: "2", name: "Widget", price: "4.5" },
      ],
    });
    renderSelector({ placeholder: "Search customers..." });
    await userEvent.type(
      screen.getByPlaceholderText("Search customers..."),
      "ac me",
    );
    expect(await screen.findByText("a@acme.test")).toBeInTheDocument();
    expect(screen.getByText("$4.50")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/customers/search?query=ac%20me",
    );
  });

  it("shows a loading state while searching", async () => {
    let resolve: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderSelector({});
    await userEvent.type(screen.getByRole("textbox"), "x");
    expect(await screen.findByText("Searching...")).toBeInTheDocument();
    resolve({ json: async () => ({}) });
    await waitFor(() =>
      expect(screen.queryByText("Searching...")).not.toBeInTheDocument(),
    );
  });

  it("selecting a result puts it in the URL and drops the page", async () => {
    searchParams.current = new URLSearchParams("page=3&other=1");
    respond({ data: [{ id: "1", name: "Acme" }] });
    renderSelector({});
    await userEvent.type(screen.getByRole("textbox"), "ac");
    await userEvent.click(await screen.findByRole("button", { name: "Acme" }));
    expect(push).toHaveBeenCalledWith("?other=1&query=Acme");
    expect(screen.getByRole("textbox")).toHaveValue("Acme");
  });

  it("renders invoices by customer and selects the customer name", async () => {
    respond({
      data: [
        { id: "i1", customer: { name: "Acme" }, total: 12, status: "paid" },
      ],
    });
    renderSelector({ apiEndpoint: "/api/invoices/search" });
    await userEvent.type(screen.getByRole("textbox"), "ac");
    expect(await screen.findByText("Invoice for Acme")).toBeInTheDocument();
    expect(screen.getByText("$12.00 - paid")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Invoice for Acme"));
    expect(push).toHaveBeenCalledWith("?query=Acme");
  });

  it("falls back to JSON for unknown items and selects an empty query", async () => {
    respond({ data: [{ id: "z" }] });
    renderSelector({});
    await userEvent.type(screen.getByRole("textbox"), "q");
    await userEvent.click(await screen.findByText('{"id":"z"}'));
    expect(push).toHaveBeenCalledWith("?");
  });

  it("uses a custom item renderer", async () => {
    respond({ data: [{ id: "1", name: "Acme" }] });
    renderSelector({
      renderItem: (item) => <span>Custom {item.name}</span>,
    });
    await userEvent.type(screen.getByRole("textbox"), "a");
    expect(await screen.findByText("Custom Acme")).toBeInTheDocument();
  });

  it("searches on Enter and on the search button", async () => {
    respond({ data: [] });
    renderSelector({});
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "acme");
    await userEvent.keyboard("{Enter}");
    expect(push).toHaveBeenLastCalledWith("?query=acme");
    await userEvent.type(input, "x");
    expect(push).toHaveBeenCalledTimes(1);
    await userEvent.clear(input);
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[buttons.length - 1]);
    expect(push).toHaveBeenLastCalledWith("?");
  });

  it("does not fetch for an empty query", async () => {
    renderSelector({});
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "a");
    await userEvent.clear(input);
    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock.mock.calls.every(([url]) => url.includes("query=a"))).toBe(
      true,
    );
  });
});
