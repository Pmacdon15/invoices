import { act, render, screen } from "@testing-library/react";
import { createElement, type ReactNode, use } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dal = vi.hoisted(() => ({
  getCustomers: vi.fn(),
  getProducts: vi.fn(),
  getInvoices: vi.fn(),
  getInvoiceById: vi.fn(),
  getStatsDal: vi.fn(),
}));

vi.mock("@/dal/customers", () => ({ getCustomers: dal.getCustomers }));
vi.mock("@/dal/products", () => ({ getProducts: dal.getProducts }));
vi.mock("@/dal/invoices", () => ({
  getInvoices: dal.getInvoices,
  getInvoiceById: dal.getInvoiceById,
}));
vi.mock("@/dal/stats", () => ({ getStatsDal: dal.getStatsDal }));

// Children that consume a promise: render what it resolved to.
const Show = ({ label, value }: { label: string; value: Promise<unknown> }) => (
  <pre data-testid={label}>{JSON.stringify(use(value))}</pre>
);

vi.mock("@/components/management/customers-management", () => ({
  CustomersManagement: ({
    resultsPromise,
  }: {
    resultsPromise: Promise<unknown>;
  }) => <Show label="customers" value={resultsPromise} />,
}));
vi.mock("@/components/management/products-management", () => ({
  ProductsManagement: ({ dataPromise }: { dataPromise: Promise<unknown> }) => (
    <Show label="products" value={dataPromise} />
  ),
}));
vi.mock("@/components/management/invoices-management", () => ({
  InvoicesManagement: (props: Record<string, Promise<unknown>>) => (
    <>
      <Show label="invoices" value={props.invoicesPromise} />
      <Show label="customers" value={props.customersPromise} />
      <Show label="products" value={props.productsPromise} />
    </>
  ),
}));
vi.mock("@/components/forms/invoice-form", () => ({
  InvoiceForm: (props: Record<string, Promise<unknown>>) => (
    <>
      <Show label="customers" value={props.customersPromise} />
      <Show label="products" value={props.productsPromise} />
    </>
  ),
}));
vi.mock("@/components/invoice-details", () => ({
  InvoiceDetails: (props: Record<string, Promise<unknown>>) => (
    <>
      <Show label="invoice" value={props.invoicePromise} />
      <Show label="customers" value={props.customersPromise} />
      <Show label="products" value={props.productsPromise} />
    </>
  ),
}));
// KPICard is an async server component; render its resolved value instead.
vi.mock("@/components/stats/kpi-card", () => ({
  KPICard: ({
    title,
    valuePromise,
  }: {
    title: string;
    valuePromise: Promise<number>;
  }) => <Show label={title} value={valuePromise} />,
}));
vi.mock("@/app/stats/stats-chart", () => ({
  StatsChart: ({ dataPromise }: { dataPromise: Promise<unknown> }) => (
    <Show label="chart" value={dataPromise} />
  ),
}));
vi.mock("@/components/ui/search-selector", () => ({
  SearchSelector: ({
    placeholder,
    apiEndpoint,
  }: {
    placeholder: string;
    apiEndpoint: string;
  }) => <input placeholder={placeholder} data-endpoint={apiEndpoint} />,
}));
vi.mock("@clerk/nextjs", () => ({
  PricingTable: (props: { for: string }) => (
    <div data-testid="pricing" data-for={props.for} />
  ),
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
}));

import CustomersPage from "@/app/customers/page";
import InvoicePage from "@/app/invoices/[id]/page";
import NewInvoicePage from "@/app/invoices/new/page";
import InvoicesPage from "@/app/invoices/page";
import Home from "@/app/page";
import PlansPage from "@/app/plans/page";
import PrivacyPage from "@/app/privacy/page";
import ProductsPage from "@/app/products/page";
import StatsPage from "@/app/stats/page";
import TermsPage from "@/app/terms/page";

// Suspense only reveals resolved children when the render is awaited in act.
const renderAsync = async (ui: ReactNode) => {
  await act(async () => {
    render(ui);
  });
};

type Search = Record<string, string | string[] | undefined>;
const props = (searchParams: Search) =>
  ({
    searchParams: Promise.resolve(searchParams),
    params: Promise.resolve({}),
  }) as PageProps<"/customers">;

beforeEach(() => {
  dal.getCustomers.mockResolvedValue({ data: ["c"] });
  dal.getProducts.mockResolvedValue({ data: ["p"] });
  dal.getInvoices.mockResolvedValue({ data: ["i"] });
  dal.getInvoiceById.mockResolvedValue({ data: { id: 7 } });
});

describe.each([
  {
    name: "customers",
    Page: CustomersPage,
    fetch: dal.getCustomers,
    heading: "Customers",
    placeholder: "Search customers...",
    endpoint: "/api/customers/search",
    call: (page: number, query?: string) => [page, false, query],
  },
  {
    name: "products",
    Page: ProductsPage,
    fetch: dal.getProducts,
    heading: "Products",
    placeholder: "Search products...",
    endpoint: "/api/products/search",
    call: (page: number, query?: string) => [page, false, query],
  },
  {
    name: "invoices",
    Page: InvoicesPage,
    fetch: dal.getInvoices,
    heading: "Invoices",
    placeholder: "Search invoices...",
    endpoint: "/api/invoices/search",
    call: (page: number, query?: string) => [page, query],
  },
])("$name page", ({
  name,
  Page,
  fetch,
  heading,
  placeholder,
  endpoint,
  call,
}) => {
  it("renders the heading and search box", async () => {
    await renderAsync(<Page {...props({})} />);
    expect(
      screen.getByRole("heading", { level: 1, name: heading }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(placeholder)).toHaveAttribute(
      "data-endpoint",
      endpoint,
    );
    expect(await screen.findAllByTestId(name)).not.toHaveLength(0);
  });

  it("defaults to page 1 with no query", async () => {
    await renderAsync(<Page {...props({})} />);
    await screen.findAllByTestId(name);
    expect(fetch).toHaveBeenCalledWith(...call(1, undefined));
  });

  it("reads page and query from the URL", async () => {
    await renderAsync(<Page {...props({ page: "3", query: "acme" })} />);
    await screen.findAllByTestId(name);
    expect(fetch).toHaveBeenCalledWith(...call(3, "acme"));
  });

  it("uses the first value of repeated params", async () => {
    await renderAsync(
      <Page {...props({ page: ["2", "5"], query: ["a", "b"] })} />,
    );
    await screen.findAllByTestId(name);
    expect(fetch).toHaveBeenCalledWith(...call(2, "a"));
  });

  it("falls back to page 1 for a non-numeric page", async () => {
    await renderAsync(<Page {...props({ page: "abc" })} />);
    await screen.findAllByTestId(name);
    expect(fetch).toHaveBeenCalledWith(...call(1, undefined));
  });
});

describe("invoices page", () => {
  it("loads every customer and product for the editors", async () => {
    await renderAsync(<InvoicesPage {...props({})} />);
    expect(await screen.findByTestId("customers")).toHaveTextContent('["c"]');
    expect(screen.getByTestId("products")).toHaveTextContent('["p"]');
    expect(dal.getCustomers).toHaveBeenCalledWith(1, true);
    expect(dal.getProducts).toHaveBeenCalledWith(1, true);
  });
});

describe("new invoice page", () => {
  it("passes every customer and product to the form", async () => {
    await renderAsync(<NewInvoicePage />);
    expect(await screen.findByTestId("customers")).toHaveTextContent('["c"]');
    expect(screen.getByTestId("products")).toHaveTextContent('["p"]');
    expect(dal.getCustomers).toHaveBeenCalledWith(1, true);
    expect(dal.getProducts).toHaveBeenCalledWith(1, true);
  });
});

describe("invoice page", () => {
  it("loads the invoice from the route param", async () => {
    await renderAsync(
      <InvoicePage
        {...({
          params: Promise.resolve({ id: "42" }),
        } as PageProps<"/invoices/[id]">)}
      />,
    );
    expect(await screen.findByTestId("invoice")).toHaveTextContent('{"id":7}');
    expect(dal.getInvoiceById).toHaveBeenCalledWith("42");
    expect(dal.getCustomers).toHaveBeenCalledWith(1, true);
    expect(dal.getProducts).toHaveBeenCalledWith(1, true);
    expect(
      screen.getByRole("link", { name: /back to invoices/i }),
    ).toHaveAttribute("href", "/invoices");
  });
});

describe("stats page", () => {
  const month = (n: number) => ({
    name: `M${n}`,
    revenue: 100 * n,
    owing: 10 * n,
    customers: n,
    invoices: 2 * n,
    draftInvoices: n,
    sentInvoices: n,
    paidInvoices: n,
  });

  it("sums each KPI across the months", async () => {
    dal.getStatsDal.mockResolvedValue({ data: [month(1), month(2)] });
    await renderAsync(<StatsPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Organization Statistics",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("Total Revenue")).toHaveTextContent("300");
    expect(screen.getByTestId("Amount Owing")).toHaveTextContent("30");
    expect(screen.getByTestId("Active Customers")).toHaveTextContent("3");
    expect(screen.getByTestId("Total Invoices")).toHaveTextContent("6");
    expect(screen.getByTestId("Draft Invoices")).toHaveTextContent("3");
    expect(screen.getByTestId("Sent Invoices")).toHaveTextContent("3");
    expect(screen.getByTestId("Paid Invoices")).toHaveTextContent("3");
    expect(screen.getByTestId("chart")).toHaveTextContent('"name":"M2"');
  });

  it("treats missing data as no months", async () => {
    dal.getStatsDal.mockResolvedValue({});
    await renderAsync(<StatsPage />);
    expect(await screen.findByTestId("Total Revenue")).toHaveTextContent("0");
    expect(screen.getByTestId("chart")).toHaveTextContent("[]");
  });

  it("throws the DAL error to the nearest error boundary", async () => {
    dal.getStatsDal.mockResolvedValue({ error: "boom" });
    const page = StatsPage() as unknown as {
      props: { children: unknown };
    };
    // Every KPI promise derives from the same failed data promise.
    const errors: unknown[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const p = (node as { props?: Record<string, unknown> }).props;
      if (!p) return;
      for (const v of Object.values(p)) {
        if (v instanceof Promise) errors.push(v);
        if (Array.isArray(v)) v.forEach(walk);
        else walk(v);
      }
    };
    walk(page);
    expect(errors.length).toBe(8);
    for (const promise of errors) {
      await expect(promise).rejects.toThrow("boom");
    }
  });
});

describe("static pages", () => {
  it("home links into the app", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: /invoicing/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create invoice/i }),
    ).toHaveAttribute("href", "/invoices/new");
    expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
      "href",
      "/plans",
    );
    const starts = screen.getAllByRole("link", { name: /get started/i });
    expect(starts.map((a) => a.getAttribute("href"))).toEqual([
      "/customers",
      "/products",
      "/invoices",
    ]);
  });

  it("plans shows the organization pricing table", () => {
    render(<PlansPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Simple, Transparent Pricing",
    );
    expect(screen.getByTestId("pricing")).toHaveAttribute(
      "data-for",
      "organization",
    );
  });

  it("privacy and terms render their headings", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeInTheDocument();
  });
});

describe("root layout", () => {
  it("wraps the page in providers, navbar and footer", async () => {
    vi.doMock("next/font/google", () => ({
      Geist: () => ({ variable: "font-sans-var" }),
      Geist_Mono: () => ({ variable: "font-mono-var" }),
    }));
    vi.doMock("@/components/navbar", () => ({
      Navbar: () => createElement("nav", null, "NAV"),
    }));
    vi.doMock("@/components/footer", () => ({
      Footer: () => createElement("footer", null, "FOOT"),
    }));
    vi.doMock("@/components/providers/provider", () => ({
      default: ({ children }: { children: ReactNode }) => children,
    }));
    vi.doMock("sonner", () => ({ Toaster: () => null }));
    const { default: RootLayout, metadata } = await import("@/app/layout");

    const html = renderToStaticMarkup(
      <RootLayout>
        <p>child</p>
      </RootLayout>,
    );
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("font-sans-var font-mono-var");
    expect(html).toMatch(
      /NAV.*<main class="flex-1"><p>child<\/p><\/main>.*FOOT/,
    );
    expect(metadata.title).toBe("InvoicePro - Effortless Invoicing");
  });
});
