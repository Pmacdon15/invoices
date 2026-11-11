/*
 * Human-readable invoice numbers: each organization numbers its invoices
 * 1, 2, 3, ... and shows them with its prefix, padded to four digits
 * (INV-0042). Past 9999 the number just grows (INV-12345).
 */

export const DEFAULT_INVOICE_PREFIX = "INV";

/** The longest prefix allowed, so numbers stay readable on the PDF. */
export const MAX_INVOICE_PREFIX_LENGTH = 12;

/** Letters, digits, dashes and underscores; no spaces. */
export const INVOICE_PREFIX_PATTERN = /^[A-Za-z0-9_-]+$/;

/** "INV-0042" from 42 and "INV"; null when the invoice has no number yet. */
export function formatInvoiceNumber(
  invoiceNumber: number | string | null | undefined,
  prefix?: string | null,
): string | null {
  if (invoiceNumber === null || invoiceNumber === undefined) return null;
  const digits = String(invoiceNumber).padStart(4, "0");
  return `${prefix || DEFAULT_INVOICE_PREFIX}-${digits}`;
}

/**
 * How an invoice is named on screen: its number, or the start of its ID for
 * one without a number (such as an optimistic row that isn't saved yet).
 */
export function invoiceLabel(invoice: {
  id: string;
  invoice_number?: number | string | null;
  invoice_prefix?: string | null;
}): string {
  return (
    formatInvoiceNumber(invoice.invoice_number, invoice.invoice_prefix) ??
    `#${invoice.id.slice(0, 8)}`
  );
}
