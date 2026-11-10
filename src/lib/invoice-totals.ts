export interface InvoiceLineAmount {
  quantity: number;
  unit_price: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function calculateInvoiceTotals(
  items: InvoiceLineAmount[],
  taxRate = 0,
): InvoiceTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const tax = (subtotal * taxRate) / 100;

  return { subtotal, tax, total: subtotal + tax };
}

/**
 * The amount an invoice bills: its manual total when one is set, otherwise
 * the line items plus tax.
 */
export function invoiceTotal(
  items: InvoiceLineAmount[],
  taxRate = 0,
  totalOverride?: number | null,
): number {
  if (totalOverride !== null && totalOverride !== undefined) {
    return Number(totalOverride);
  }
  return calculateInvoiceTotals(items, taxRate).total;
}

/** A line item's display name: its product's name, or its own description. */
export function lineItemName(item: {
  description?: string | null;
  product?: { name: string } | null;
  product_name?: string | null;
}): string {
  return item.product?.name ?? item.product_name ?? item.description ?? "Item";
}
