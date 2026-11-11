import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { getOrgSettingsDal, updateInvoicePrefixDal } from "@/dal/org-settings";
import { getOverdueStatsDal, getStatsDal } from "@/dal/stats";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import type { CallerContext, McpCaller } from "@/mcp/caller";
import { listCallerOrgs } from "@/mcp/caller";
import { orgIdField } from "@/mcp/catalog-tools";
import { SEND_EMAIL_FEATURE } from "@/mcp/invoice-tools";
import {
  dalFailure,
  failure,
  invalidate,
  money,
  type ToolResult,
} from "@/mcp/results";

/*
 * Organization-level tools: which organizations the user can work in, the
 * Stats page's numbers, the logo invoices are branded with (the Clerk
 * organization image, the same one the app and the email show) and the
 * prefix invoice numbers get.
 */

export const listOrganizationsInputSchema = z.object({});

export async function listOrganizationsTool(
  caller: McpCaller,
): Promise<ToolResult> {
  const organizations = await listCallerOrgs(caller.userId);
  return {
    summary:
      organizations.length === 0
        ? "You don't belong to an InvoicePro organization yet."
        : organizations.length === 1
          ? `You're in one organization, ${organizations[0].name}; every tool uses it automatically.`
          : `You're in ${organizations.length} organizations. Pass org_id to choose one.`,
    data: { organizations },
  };
}

export const getOrganizationInputSchema = z.object({ org_id: orgIdField });

export async function getOrganizationTool(
  ctx: CallerContext,
): Promise<ToolResult> {
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: ctx.orgId,
  });
  const canSend = ctx.has({ feature: SEND_EMAIL_FEATURE });
  const settings = await getOrgSettingsDal(ctx);
  const numbering =
    settings.error === null
      ? {
          invoice_prefix: settings.data.invoice_prefix,
          next_invoice_number: formatInvoiceNumber(
            settings.data.last_invoice_number + 1,
            settings.data.invoice_prefix,
          ),
        }
      : { invoice_prefix: null, next_invoice_number: null };
  return {
    summary: `${org.name}: ${canSend ? "can" : "can't"} email invoices on its plan; ${org.hasImage ? "has a logo" : "no logo yet"}.`,
    data: {
      organization: {
        org_id: org.id,
        name: org.name,
        slug: org.slug ?? null,
        your_role: ctx.org.role,
        logo_url: org.hasImage ? org.imageUrl : null,
        can_email_invoices: canSend,
        ...numbering,
        plan_features: [...ctx.features].sort(),
      },
    },
  };
}

export const getStatsInputSchema = z.object({ org_id: orgIdField });

export async function getStatsTool(ctx: CallerContext): Promise<ToolResult> {
  const [result, overdueResult] = await Promise.all([
    getStatsDal(ctx),
    getOverdueStatsDal(ctx),
  ]);
  if (result.error !== null || !result.data) {
    return failure(result.error ?? "Couldn't load the stats.");
  }
  if (overdueResult.error !== null || !overdueResult.data) {
    return failure(overdueResult.error ?? "Couldn't load the stats.");
  }
  const overdue = overdueResult.data;
  const months = result.data;
  const sum = (key: "revenue" | "owing" | "invoices") =>
    months.reduce((total, month) => total + month[key], 0);
  const totals = {
    revenue: sum("revenue"),
    owing: sum("owing"),
    invoices: sum("invoices"),
  };
  return {
    summary: `Last 12 months: ${money.format(totals.revenue)} invoiced (sent or paid), ${money.format(totals.owing)} still owing on sent invoices, ${totals.invoices} invoice(s). Overdue now: ${overdue.count} invoice(s), ${money.format(overdue.total)}.`,
    data: { months, totals, overdue },
  };
}

/** The biggest logo accepted, matching Clerk's own limit. */
const MAX_LOGO_BYTES = 10 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export const manageLogoInputSchema = z.object({
  org_id: orgIdField,
  action: z
    .enum(["set", "remove"])
    .describe("'set' uploads a new logo; 'remove' takes the logo off."),
  image_base64: z
    .string()
    .optional()
    .describe(
      "With 'set': the image (PNG, JPEG, GIF or WebP, up to 10 MB) as base64, without a data: prefix.",
    ),
  mime_type: z
    .enum(["image/png", "image/jpeg", "image/gif", "image/webp"])
    .optional()
    .describe("With image_base64: the image's type. Defaults to image/png."),
  image_url: z
    .string()
    .optional()
    .describe(
      "With 'set', instead of image_base64: a public https:// URL of the image.",
    ),
});

async function logoFromUrl(raw: string): Promise<Blob | string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "image_url isn't a valid URL.";
  }
  if (url.protocol !== "https:") return "image_url must start with https://.";
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    if (!res.ok) return `Couldn't download the image (HTTP ${res.status}).`;
    const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!LOGO_TYPES.includes(type)) {
      return "That URL isn't a PNG, JPEG, GIF or WebP image.";
    }
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_LOGO_BYTES) return "The image is over 10 MB.";
    return new Blob([bytes], { type });
  } catch {
    return "Couldn't download the image.";
  }
}

export async function manageLogoTool(
  ctx: CallerContext,
  args: z.infer<typeof manageLogoInputSchema>,
): Promise<ToolResult> {
  if (ctx.org.role !== "org:admin") {
    return failure("Only an organization admin can change the logo.");
  }
  const client = await clerkClient();

  if (args.action === "remove") {
    await client.organizations.deleteOrganizationLogo(ctx.orgId);
    invalidate(ctx.orgId, ["invoices"]);
    return {
      summary: `Removed ${ctx.org.name}'s logo. Invoices show just the name now.`,
      data: { logo_url: null },
    };
  }

  let file: Blob;
  if (args.image_base64) {
    const bytes = Buffer.from(
      args.image_base64.replace(/^data:[^,]*,/, ""),
      "base64",
    );
    if (bytes.length === 0) return failure("image_base64 is empty.");
    if (bytes.length > MAX_LOGO_BYTES)
      return failure("The image is over 10 MB.");
    file = new Blob([new Uint8Array(bytes)], {
      type: args.mime_type ?? "image/png",
    });
  } else if (args.image_url) {
    const fetched = await logoFromUrl(args.image_url);
    if (typeof fetched === "string") return failure(fetched);
    file = fetched;
  } else {
    return failure("To set a logo, pass image_base64 or image_url.");
  }

  const org = await client.organizations.updateOrganizationLogo(ctx.orgId, {
    file,
    uploaderUserId: ctx.userId,
  });
  invalidate(ctx.orgId, ["invoices"]);
  return {
    summary: `Updated ${org.name}'s logo. New invoices, PDFs and emails use it.`,
    data: { logo_url: org.imageUrl },
  };
}

export const setInvoicePrefixInputSchema = z.object({
  org_id: orgIdField,
  prefix: z
    .string()
    .describe(
      "The new prefix, e.g. 'INV' (invoices read INV-0042) or 'ACME'. Letters, digits, dashes and underscores, up to 12 characters.",
    ),
});

export async function setInvoicePrefixTool(
  ctx: CallerContext,
  args: z.infer<typeof setInvoicePrefixInputSchema>,
): Promise<ToolResult> {
  const result = await updateInvoicePrefixDal(args.prefix, ctx);
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["org-settings"]);
  const next = formatInvoiceNumber(
    result.value.last_invoice_number + 1,
    result.value.invoice_prefix,
  );
  return {
    summary: `New invoices are numbered with ${result.value.invoice_prefix}; the next one is ${next}. Invoices already made keep their number.`,
    data: {
      invoice_prefix: result.value.invoice_prefix,
      next_invoice_number: next,
    },
  };
}
