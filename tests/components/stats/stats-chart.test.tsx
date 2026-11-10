import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

// jsdom has no layout engine, so real Recharts renders nothing; these stand-ins
// expose the props the chart passes in.
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
    XAxis: () => null,
    YAxis: ({ yAxisId, tickFormatter }: Props) => (
      <span data-testid={`y-${yAxisId}`}>
        {typeof tickFormatter === "function" ? tickFormatter(25) : "none"}
      </span>
    ),
    Tooltip: () => null,
    Legend: () => <div data-testid="legend" />,
    Line: ({ dataKey, name, yAxisId }: Props) => (
      <span data-testid="line" data-axis={String(yAxisId)}>
        {String(name)}:{String(dataKey)}
      </span>
    ),
  };
});

import { StatsChart } from "@/components/stats/stats-chart";

const row = {
  name: "Jan",
  revenue: 100,
  expenses: 20,
  customers: 3,
  invoices: 4,
};

async function renderChart(data: unknown) {
  await act(async () => {
    render(
      <Suspense fallback="loading">
        <StatsChart dataPromise={Promise.resolve(data as never)} />
      </Suspense>,
    );
  });
}

describe("StatsChart", () => {
  it("plots revenue, expenses, customers and invoices", async () => {
    await renderChart([row]);
    const chart = screen.getByTestId("line-chart");
    expect(JSON.parse(chart.dataset.chart as string)).toEqual([row]);
    expect(screen.getAllByTestId("line").map((l) => l.textContent)).toEqual([
      "Revenue:revenue",
      "Expenses:expenses",
      "Customers:customers",
      "Invoices:invoices",
    ]);
    expect(screen.getByTestId("y-left")).toHaveTextContent("$25");
    expect(screen.getByTestId("y-right")).toHaveTextContent("none");
    expect(screen.getByTestId("legend")).toBeInTheDocument();
  });

  it.each([
    ["empty", []],
    ["missing", null],
  ])("shows an empty state for %s data", async (_label, data) => {
    await renderChart(data);
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});
