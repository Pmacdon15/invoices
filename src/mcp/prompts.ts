import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

/*
 * Ready-made prompts the AI app can offer (slash commands in some clients).
 * They only build instructions; the tools do the work and every rule in the
 * server instructions (ask before adding, confirm before sending) still holds.
 */

const userMessage = (text: string) => ({
  messages: [
    { role: "user" as const, content: { type: "text" as const, text } },
  ],
});

export const PROMPTS = {
  new_invoice: (args: { details?: string }) =>
    userMessage(
      `Create an invoice in InvoicePro${args.details ? ` for: ${args.details}` : ""}. Find the customer with list_customers and the items with list_products. If the customer or an item isn't there, ask me whether to add it (or bill an item once as a one-off) before creating anything. Then create it as a draft and show it to me. Don't send it unless I say so.`,
    ),
  unpaid_invoices: () =>
    userMessage(
      "Which of my InvoicePro invoices are still unpaid? List the sent invoices (list_invoices with status 'sent', every page), with customer, amount and date, oldest first, and the total owing.",
    ),
  send_invoice: (args: { invoice?: string }) =>
    userMessage(
      `Send ${args.invoice ? `the InvoicePro invoice "${args.invoice}"` : "an InvoicePro invoice"} to its customer. Find it with list_invoices if you need to, show me the send_invoice preview (who it goes to and the amount), and only send it after I confirm.`,
    ),
  monthly_summary: () =>
    userMessage(
      "Summarize my InvoicePro business with get_stats: revenue and invoice counts by month for the last 12 months, what's owing now, and how this month compares with last month.",
    ),
};

export function registerInvoicePrompts(server: McpServer) {
  server.registerPrompt(
    "new_invoice",
    {
      title: "Create an invoice",
      description:
        "Create a draft invoice, checking the customer and items first.",
      argsSchema: z.object({
        details: z
          .string()
          .optional()
          .describe("Who it's for and what to bill, in your own words."),
      }),
    },
    (args) => PROMPTS.new_invoice(args),
  );
  server.registerPrompt(
    "unpaid_invoices",
    {
      title: "Unpaid invoices",
      description:
        "List sent invoices that aren't paid yet and the total owing.",
    },
    () => PROMPTS.unpaid_invoices(),
  );
  server.registerPrompt(
    "send_invoice",
    {
      title: "Send an invoice",
      description: "Email an invoice to its customer, after you confirm.",
      argsSchema: z.object({
        invoice: z
          .string()
          .optional()
          .describe("Which invoice: its ID, or the customer's name."),
      }),
    },
    (args) => PROMPTS.send_invoice(args),
  );
  server.registerPrompt(
    "monthly_summary",
    {
      title: "Monthly summary",
      description: "Revenue, invoice counts and what's owing, by month.",
    },
    () => PROMPTS.monthly_summary(),
  );
}
