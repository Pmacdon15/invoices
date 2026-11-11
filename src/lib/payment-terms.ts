/*
 * Payment terms: when an invoice is due. Invoices store only the due date
 * (YYYY-MM-DD, or NULL for due upon receipt); "Net 15" and "Net 30" are that
 * many days after the invoice date.
 */

export const PAYMENT_TERMS = ["receipt", "net15", "net30", "custom"] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  receipt: "Due upon receipt",
  net15: "Net 15",
  net30: "Net 30",
  custom: "Custom date",
};

const NET_DAYS = { net15: 15, net30: 30 } as const;

/** A YYYY-MM-DD date. */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A date as YYYY-MM-DD. A Date (such as Postgres returns for a DATE column,
 * at local midnight) uses its local calendar day; a string keeps its first
 * ten characters. Null for nothing.
 */
export function toIsoDate(
  value: Date | string | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** The calendar day `days` after a YYYY-MM-DD date. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The due date for the terms, counted from the invoice date: null for due
 * upon receipt, and the given date for custom terms.
 */
export function dueDateForTerms(
  terms: PaymentTerms,
  invoiceDate: string,
  customDate?: string | null,
): string | null {
  if (terms === "receipt") return null;
  if (terms === "custom") return customDate || null;
  return addDays(invoiceDate, NET_DAYS[terms]);
}

/** The terms a stored due date reads as, given the invoice date. */
export function termsForDueDate(
  dueDate: string | null | undefined,
  invoiceDate: string,
): PaymentTerms {
  if (!dueDate) return "receipt";
  if (dueDate === addDays(invoiceDate, NET_DAYS.net15)) return "net15";
  if (dueDate === addDays(invoiceDate, NET_DAYS.net30)) return "net30";
  return "custom";
}

/** A YYYY-MM-DD date as "Dec 11, 2026", the same in every time zone. */
export function formatIsoDate(
  isoDate: string,
  month: "short" | "long" = "short",
): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month,
    day: "numeric",
    timeZone: "UTC",
  });
}

/** When the invoice is due, for display: "Dec 11, 2026" or "Upon receipt". */
export function formatDueDate(
  dueDate: Date | string | null | undefined,
  month: "short" | "long" = "short",
): string {
  const iso = toIsoDate(dueDate);
  return iso ? formatIsoDate(iso, month) : "Upon receipt";
}

/** The email's payment sentence: "due by December 11, 2026" or "upon receipt". */
export function paymentDueSentence(
  dueDate: Date | string | null | undefined,
): string {
  const iso = toIsoDate(dueDate);
  return iso
    ? `Payment is due by ${formatIsoDate(iso, "long")}.`
    : "Payment is due upon receipt.";
}
