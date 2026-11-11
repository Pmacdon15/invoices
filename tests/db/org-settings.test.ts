import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlMock } from "./sql-mock";

const mocks = vi.hoisted(() => ({ neon: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({ neon: mocks.neon }));
vi.mock("next/cache", () => ({ cacheTag: mocks.cacheTag }));

import { getOrgSettingsDb, updateInvoicePrefixDb } from "@/db/org-settings";

const sql = createSqlMock();
const ORG = "org_1";

beforeEach(() => {
  sql.reset();
  mocks.neon.mockReturnValue(sql.sql);
  vi.stubEnv("DATABASE_URL", "postgres://test");
});

describe("getOrgSettingsDb", () => {
  it("throws without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getOrgSettingsDb(ORG)).rejects.toThrow("Config Error");
  });

  it("returns the org's saved settings, cached under its tag", async () => {
    const saved = {
      org_id: ORG,
      invoice_prefix: "ACME",
      last_invoice_number: 41,
    };
    sql.respond(() => [saved]);
    await expect(getOrgSettingsDb(ORG)).resolves.toEqual(saved);
    expect(mocks.cacheTag).toHaveBeenCalledWith(`org-settings-${ORG}`);
    expect(sql.queries()[0].text).toContain("FROM org_settings");
    expect(sql.queries()[0].values).toEqual([ORG]);
  });

  it("returns the defaults for an org that hasn't saved any", async () => {
    await expect(getOrgSettingsDb(ORG)).resolves.toEqual({
      org_id: ORG,
      invoice_prefix: "INV",
      last_invoice_number: 0,
    });
  });
});

describe("updateInvoicePrefixDb", () => {
  it("throws without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(updateInvoicePrefixDb(ORG, "ACME")).rejects.toThrow(
      "Config Error",
    );
  });

  it("upserts the prefix and returns the settings", async () => {
    const saved = {
      org_id: ORG,
      invoice_prefix: "ACME",
      last_invoice_number: 3,
    };
    sql.respond(() => [saved]);
    await expect(updateInvoicePrefixDb(ORG, "ACME")).resolves.toEqual(saved);
    const [query] = sql.queries();
    expect(query.text).toContain("INSERT INTO org_settings");
    expect(query.text).toContain(
      "ON CONFLICT (org_id) DO UPDATE SET invoice_prefix = EXCLUDED.invoice_prefix",
    );
    expect(query.values).toEqual([ORG, "ACME"]);
  });
});
