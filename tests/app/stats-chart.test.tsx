import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// jsdom has no layout engine, so the real Recharts draws nothing. These
// stand-ins expose the props the chart passes in.
vi.mock("recharts", () => {
  type Props = { children?: ReactNode; [key: string]: unknown };
  return {
    ResponsiveContainer: ({ children }: Props) => <>{children}</>,
    LineChart: ({ children, data }: Props) => (
      <div data-testid="line-chart" data-chart={JSON.stringify(data)}>
        {children}
      </div>
    ),
    CartesianGrid: () => null,
    XAxis: ({ dataKey }: Props) => (
      <span data-testid="x-axis">{String(dataKey)}</span>
    ),
    YAxis: ({ yAxisId, tickFormatter }: Props) => (
      <span data-testid={`y-axis-${yAxisId}`}>
        {typeof tickFormatter === "function" ? tickFormatter(1250) : "plain"}
      </span>
    ),
    Tooltip: () => null,
    Legend: () => <div data-testid="legend" />,
    Line: ({ dataKey, name, yAxisId }: Props) => (
      <span data-testid="line" data-axis={String(yAxisId)}>
        {`${String(dataKey)}:${String(name)}`}
      </span>
    ),
  };
});

import { StatsChart } from "@/app/stats/stats-chart";

const month = {
  name: "Jan",
  revenue: 500,
  customers: 2,
  invoices: 4,
  draftInvoices: 1,
  sentInvoices: 2,
  paidInvoices: 1,
  owing: 50,
};

const renderChart = async (data: unknown) => {
  await act(async () => {
    render(<StatsChart dataPromise={Promise.resolve(data as never)} />);
  });
};

describe("StatsChart", () => {
  it("shows an empty state when there are no months", async () => {
    await renderChart([]);
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("shows an empty state when the data is missing", async () => {
    await renderChart(null);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("charts every series with money on the left axis", async () => {
    await renderChart([month]);
    expect(screen.getByTestId("line-chart")).toHaveAttribute(
      "data-chart",
      JSON.stringify([month]),
    );
    expect(screen.getByTestId("x-axis")).toHaveTextContent("name");
    expect(screen.getByTestId("y-axis-left")).toHaveTextContent("$1250");
    expect(screen.getByTestId("y-axis-right")).toHaveTextContent("plain");

    const lines = screen.getAllByTestId("line");
    expect(lines.map((l) => l.textContent)).toEqual([
      "revenue:Revenue",
      "owing:Amount Owing",
      "customers:Active Customers",
      "invoices:Total Invoices",
      "draftInvoices:Draft Invoices",
      "sentInvoices:Sent Invoices",
      "paidInvoices:Paid Invoices",
    ]);
    expect(lines.map((l) => l.dataset.axis)).toEqual([
      "left",
      "left",
      "right",
      "right",
      "right",
      "right",
      "right",
    ]);
  });
});
