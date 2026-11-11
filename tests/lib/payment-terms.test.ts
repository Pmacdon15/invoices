import { describe, expect, it } from "vitest";
import {
  addDays,
  dueDateForTerms,
  formatDueDate,
  formatIsoDate,
  paymentDueSentence,
  termsForDueDate,
  toIsoDate,
} from "@/lib/payment-terms";

describe("toIsoDate", () => {
  it("reads a Date by its local calendar day", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toIsoDate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("keeps the date part of a string", () => {
    expect(toIsoDate("2026-02-14")).toBe("2026-02-14");
    expect(toIsoDate("2026-02-14T10:00:00.000Z")).toBe("2026-02-14");
  });

  it("is null for nothing", () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate(undefined)).toBeNull();
    expect(toIsoDate("")).toBeNull();
  });
});

describe("addDays", () => {
  it("moves across months and years", () => {
    expect(addDays("2026-11-11", 30)).toBe("2026-12-11");
    expect(addDays("2026-12-20", 15)).toBe("2027-01-04");
    expect(addDays("2028-02-20", 15)).toBe("2028-03-06");
  });
});

describe("dueDateForTerms", () => {
  it("counts net terms from the invoice date", () => {
    expect(dueDateForTerms("net15", "2026-11-11")).toBe("2026-11-26");
    expect(dueDateForTerms("net30", "2026-11-11")).toBe("2026-12-11");
  });

  it("is null upon receipt, and the given date for custom terms", () => {
    expect(dueDateForTerms("receipt", "2026-11-11", "2027-01-01")).toBeNull();
    expect(dueDateForTerms("custom", "2026-11-11", "2027-01-01")).toBe(
      "2027-01-01",
    );
    expect(dueDateForTerms("custom", "2026-11-11")).toBeNull();
    expect(dueDateForTerms("custom", "2026-11-11", "")).toBeNull();
  });
});

describe("termsForDueDate", () => {
  it("reads the terms back from the due date", () => {
    expect(termsForDueDate(null, "2026-11-11")).toBe("receipt");
    expect(termsForDueDate(undefined, "2026-11-11")).toBe("receipt");
    expect(termsForDueDate("2026-11-26", "2026-11-11")).toBe("net15");
    expect(termsForDueDate("2026-12-11", "2026-11-11")).toBe("net30");
    expect(termsForDueDate("2026-12-01", "2026-11-11")).toBe("custom");
  });
});

describe("formatting", () => {
  it("formats a date the same in every time zone", () => {
    expect(formatIsoDate("2026-12-11")).toBe("Dec 11, 2026");
    expect(formatIsoDate("2026-12-11", "long")).toBe("December 11, 2026");
  });

  it("formats when an invoice is due", () => {
    expect(formatDueDate("2026-12-11")).toBe("Dec 11, 2026");
    expect(formatDueDate(new Date(2026, 11, 11), "long")).toBe(
      "December 11, 2026",
    );
    expect(formatDueDate(null)).toBe("Upon receipt");
  });

  it("words the email's payment sentence", () => {
    expect(paymentDueSentence("2026-12-11")).toBe(
      "Payment is due by December 11, 2026.",
    );
    expect(paymentDueSentence(undefined)).toBe("Payment is due upon receipt.");
  });
});
