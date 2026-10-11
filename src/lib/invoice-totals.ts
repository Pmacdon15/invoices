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
