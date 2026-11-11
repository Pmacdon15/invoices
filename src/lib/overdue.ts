import type { Invoice } from "@/dal/types";

/*
 * Overdue is derived, never stored: a sent invoice whose due date is before
 * today is overdue. The invoice reads in src/db/invoices.ts select it as
 * `overdue` against the database's CURRENT_DATE (UTC), and src/db/stats.ts
 * sums overdue invoices the same way, so pages never read the clock while
 * rendering. An invoice with no due date (due upon receipt), a draft or a
 * paid invoice is never overdue.
 *
 * Reads are cached ("use cache") and no mutation happens when a due date
 * passes, so the flag can lag midnight by up to the cache's revalidation
 * window: the default profile's 15 minutes for invoice reads, the "hours"
 * profile's hour for stats. That's fine for a day-granular status.
 */

export type DisplayStatus = Invoice["status"] | "overdue";

/** Whether the invoice is overdue. The flag only counts while it's sent. */
export function isOverdue(
  invoice: Pick<Invoice, "status" | "overdue">,
): boolean {
  return invoice.status === "sent" && invoice.overdue === true;
}

/** The status to show: "overdue" for an overdue sent invoice. */
export function displayStatus(
  invoice: Pick<Invoice, "status" | "overdue">,
): DisplayStatus {
  return isOverdue(invoice) ? "overdue" : invoice.status;
}
