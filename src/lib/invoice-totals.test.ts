import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals } from "./invoice-totals";

describe("calculateInvoiceTotals", () => {
  it("returns zero amounts for an empty invoice", () => {
    expect(calculateInvoiceTotals([])).toEqual({
      subtotal: 0,
      tax: 0,
      total: 0,
    });
  });

  it("defaults the tax rate to zero", () => {
    expect(calculateInvoiceTotals([{ quantity: 3, unit_price: 12.5 }])).toEqual(
      { subtotal: 37.5, tax: 0, total: 37.5 },
    );
  });

  it("sums multiple line items", () => {
    expect(
      calculateInvoiceTotals([
        { quantity: 2, unit_price: 10 },
        { quantity: 3, unit_price: 4.5 },
      ]),
    ).toEqual({ subtotal: 33.5, tax: 0, total: 33.5 });
  });

  it("calculates tax on the subtotal", () => {
    expect(
      calculateInvoiceTotals(
        [
          { quantity: 2, unit_price: 10 },
          { quantity: 3, unit_price: 4.5 },
        ],
        5,
      ),
    ).toEqual({ subtotal: 33.5, tax: 1.675, total: 35.175 });
  });

  it("supports a zero tax rate", () => {
    expect(
      calculateInvoiceTotals([{ quantity: 1, unit_price: 80 }], 0),
    ).toEqual({ subtotal: 80, tax: 0, total: 80 });
  });

  it("supports the maximum accepted tax rate", () => {
    expect(
      calculateInvoiceTotals([{ quantity: 1, unit_price: 80 }], 100),
    ).toEqual({ subtotal: 80, tax: 80, total: 160 });
  });

  it("preserves fractional cents for the caller to format", () => {
    const totals = calculateInvoiceTotals(
      [{ quantity: 3, unit_price: 0.1 }],
      7.5,
    );
    expect(totals.subtotal).toBeCloseTo(0.3);
    expect(totals.tax).toBeCloseTo(0.0225);
    expect(totals.total).toBeCloseTo(0.3225);
  });
});
