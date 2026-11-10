import { revalidateTag } from "next/cache";

/*
 * What every InvoicePro tool returns, and how the data layer's errors read
 * to the assistant. A tool answers with one plain sentence (`summary`) and
 * the data behind it; `respond` turns that into MCP content with the same
 * data as `structuredContent`, which the invoice card reads.
 */

export type EmbeddedResource =
  | { uri: string; mimeType: string; text: string }
  | { uri: string; mimeType: string; blob: string };

export type ToolResult = {
  summary: string;
  data: Record<string, unknown>;
  isError?: boolean;
  resources?: EmbeddedResource[];
};

const text = (value: string) => ({ type: "text" as const, text: value });

/** A tool's result as MCP content: the sentence first, then the data as JSON. */
export function respond(result: ToolResult) {
  return {
    content: [
      text(result.summary),
      text(JSON.stringify(result.data, null, 2)),
      ...(result.resources ?? []).map((resource) => ({
        type: "resource" as const,
        resource,
      })),
    ],
    structuredContent: result.data,
    ...(result.isError ? { isError: true } : {}),
  };
}

/** A failed tool call. */
export function failure(
  summary: string,
  data: Record<string, unknown> = {},
): ToolResult {
  return { summary, data: { error: summary, ...data }, isError: true };
}

/** An error from a DAL function (neverthrow `err` value). */
export type DalError = {
  reason: string;
  message?: string;
  errors?: unknown;
};

/** The DAL error as a sentence the assistant can pass on. */
export function dalErrorMessage(error: DalError): string {
  switch (error.reason) {
    case "Not authorized":
      return "You're not allowed to do that in this organization.";
    case "Validation failed":
      return "Some of the details aren't valid.";
    case "Over organization membership limit":
      return "The organization has more members than its plan allows. Remove members or upgrade first.";
    case "Failed to verify limits":
      return "Couldn't check the plan's limits right now. Try again shortly.";
    default:
      return error.message
        ? `${error.reason}: ${error.message}`
        : `${error.reason}.`.replace(/\.\.$/, ".");
  }
}

/** A failed tool call from a DAL error, with the validation details if any. */
export function dalFailure(error: DalError): ToolResult {
  return failure(
    dalErrorMessage(error),
    error.errors ? { details: error.errors } : {},
  );
}

/**
 * Expires the cached reads a change affects, right away, so the app and the
 * next tool call see it. (Server actions use `updateTag`; that only works
 * inside a server action, and the MCP endpoint is a route handler.)
 */
export function invalidate(
  orgId: string,
  kinds: ("invoices" | "customers" | "products" | "stats")[],
  invoiceId?: string,
) {
  for (const kind of kinds) revalidateTag(`${kind}-${orgId}`, { expire: 0 });
  if (invoiceId) revalidateTag(`invoice-${invoiceId}`, { expire: 0 });
}

/** Money as the app shows it. */
export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
