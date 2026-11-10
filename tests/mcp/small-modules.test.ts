import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

import { MCP_INSTRUCTIONS } from "@/mcp/instructions";
import { PROMPTS, registerInvoicePrompts } from "@/mcp/prompts";
import {
  checkRateLimit,
  MCP_REQUEST_LIMIT,
  resetRateLimits,
} from "@/mcp/rate-limit";
import {
  dalErrorMessage,
  dalFailure,
  failure,
  invalidate,
  respond,
} from "@/mcp/results";

beforeEach(() => resetRateLimits());

describe("rate limit", () => {
  const limit = { name: "t", limit: 2, windowSeconds: 10 };

  it("allows the limit per window, then says when to retry", () => {
    expect(checkRateLimit(limit, "a", 0)).toEqual({ ok: true });
    expect(checkRateLimit(limit, "a", 1000)).toEqual({ ok: true });
    expect(checkRateLimit(limit, "a", 2000)).toEqual({
      ok: false,
      retryAfterSeconds: 8,
    });
    expect(checkRateLimit(limit, "a", 9999)).toEqual({
      ok: false,
      retryAfterSeconds: 1,
    });
    expect(checkRateLimit(limit, "b", 2000)).toEqual({ ok: true });
    expect(checkRateLimit(limit, "a", 10_000)).toEqual({ ok: true });
  });

  it("keeps memory bounded by dropping the oldest windows", () => {
    for (let i = 0; i <= 10_000; i++)
      checkRateLimit(MCP_REQUEST_LIMIT, `u${i}`, 0);
    // u0 was dropped, so it starts a fresh window.
    for (let i = 0; i < MCP_REQUEST_LIMIT.limit; i++) {
      expect(checkRateLimit(MCP_REQUEST_LIMIT, "u0", 1).ok).toBe(true);
    }
  });
});

describe("results", () => {
  it("puts the sentence first, then the data, then attachments", () => {
    expect(
      respond({
        summary: "Done.",
        data: { a: 1 },
        resources: [{ uri: "x", mimeType: "application/pdf", blob: "AA==" }],
      }),
    ).toEqual({
      content: [
        { type: "text", text: "Done." },
        { type: "text", text: '{\n  "a": 1\n}' },
        {
          type: "resource",
          resource: { uri: "x", mimeType: "application/pdf", blob: "AA==" },
        },
      ],
      structuredContent: { a: 1 },
    });
    expect(respond(failure("Nope."))).toMatchObject({
      isError: true,
      structuredContent: { error: "Nope." },
    });
  });

  it("explains data-layer errors", () => {
    expect(dalErrorMessage({ reason: "Not authorized" })).toContain(
      "not allowed",
    );
    expect(dalErrorMessage({ reason: "Validation failed" })).toContain(
      "aren't valid",
    );
    expect(
      dalErrorMessage({ reason: "Over organization membership limit" }),
    ).toContain("more members");
    expect(dalErrorMessage({ reason: "Failed to verify limits" })).toContain(
      "Try again",
    );
    expect(
      dalErrorMessage({
        reason: "Failed to send invoice",
        message: "SES down",
      }),
    ).toBe("Failed to send invoice: SES down");
    expect(dalErrorMessage({ reason: "Db failed to create invoice" })).toBe(
      "Db failed to create invoice.",
    );
    expect(
      dalErrorMessage({
        reason: "Usage limit reached, limit: 5. Consider upgrading.",
      }),
    ).toBe("Usage limit reached, limit: 5. Consider upgrading.");
    expect(
      dalFailure({ reason: "Validation failed", errors: { x: 1 } }).data,
    ).toEqual({
      error: "Some of the details aren't valid.",
      details: { x: 1 },
    });
    expect(dalFailure({ reason: "Not authorized" }).data).not.toHaveProperty(
      "details",
    );
  });

  it("expires the affected cache tags right away", () => {
    invalidate("org_1", ["invoices", "stats"], "inv_1");
    expect(mocks.revalidateTag.mock.calls).toEqual([
      ["invoices-org_1", { expire: 0 }],
      ["stats-org_1", { expire: 0 }],
      ["invoice-inv_1", { expire: 0 }],
    ]);
    mocks.revalidateTag.mockClear();
    invalidate("org_1", ["customers"]);
    expect(mocks.revalidateTag.mock.calls).toEqual([
      ["customers-org_1", { expire: 0 }],
    ]);
  });
});

describe("prompts", () => {
  it("registers each prompt and builds its message", () => {
    const registerPrompt = vi.fn();
    registerInvoicePrompts({ registerPrompt } as never);
    const names = registerPrompt.mock.calls.map((c) => c[0]);
    expect(names).toEqual([
      "new_invoice",
      "unpaid_invoices",
      "send_invoice",
      "monthly_summary",
    ]);
    const texts = registerPrompt.mock.calls.map(
      (c) =>
        (c[2] as (a: object) => { messages: { content: { text: string } }[] })(
          {},
        ).messages[0].content.text,
    );
    expect(texts[0]).toContain("ask me whether to add it");
    expect(texts[1]).toContain("status 'sent'");
    expect(texts[2]).toContain("only send it after I confirm");
    expect(texts[3]).toContain("get_stats");
    expect(
      PROMPTS.new_invoice({ details: "Acme, 2h consulting" }).messages[0]
        .content.text,
    ).toContain("for: Acme, 2h consulting");
    expect(
      PROMPTS.send_invoice({ invoice: "Acme" }).messages[0].content.text,
    ).toContain('"Acme"');
  });

  it("tells every client to confirm before sending", () => {
    expect(MCP_INSTRUCTIONS).toContain("confirm: true");
    expect(MCP_INSTRUCTIONS).toContain("ask before adding them");
  });
});
