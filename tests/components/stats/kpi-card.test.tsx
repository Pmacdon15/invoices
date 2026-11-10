import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPICard } from "@/components/stats/kpi-card";

describe("KPICard", () => {
  it("awaits its value and formats it with a prefix and suffix", async () => {
    render(
      await KPICard({
        title: "Total Revenue",
        valuePromise: Promise.resolve(12345.5),
        icon: <svg data-testid="icon" />,
        subtext: "In the last 12 months",
        prefix: "$",
        suffix: " CAD",
      }),
    );
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("$12,345.5 CAD")).toBeInTheDocument();
    expect(screen.getByText("In the last 12 months")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("shows a bare number without a prefix or suffix", async () => {
    const { container } = render(
      await KPICard({
        title: "Invoices",
        valuePromise: Promise.resolve(7),
        icon: null,
        subtext: "count",
      }),
    );
    expect(container.querySelector(".text-2xl")).toHaveTextContent(/^7$/);
  });
});
