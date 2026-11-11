import { describe, expect, it } from "vitest";
import { formatInvoiceNumber, invoiceLabel } from "@/lib/invoice-number";

describe("formatInvoiceNumber", () => {
  it("pads the number to four digits after the prefix", () => {
    expect(formatInvoiceNumber(42, "INV")).toBe("INV-0042");
    expect(formatInvoiceNumber("7", "ACME")).toBe("ACME-0007");
    expect(formatInvoiceNumber(12345, "INV")).toBe("INV-12345");
  });

  it("uses the default prefix when there's none", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-0001");
    expect(formatInvoiceNumber(1, null)).toBe("INV-0001");
    expect(formatInvoiceNumber(1, "")).toBe("INV-0001");
  });

  it("is null without a number", () => {
    expect(formatInvoiceNumber(null, "INV")).toBeNull();
    expect(formatInvoiceNumber(undefined)).toBeNull();
  });
});

describe("invoiceLabel", () => {
  it("is the number, or the start of the ID without one", () => {
    expect(
      invoiceLabel({
        id: "abcdef12-3456",
        invoice_number: 3,
        invoice_prefix: "X",
      }),
    ).toBe("X-0003");
    expect(invoiceLabel({ id: "abcdef12-3456" })).toBe("#abcdef12");
  });
});
