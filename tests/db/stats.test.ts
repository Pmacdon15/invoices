import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlMock } from "./sql-mock";

const mocks = vi.hoisted(() => ({
  neon: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({ neon: mocks.neon }));
vi.mock("next/cache", () => ({
  cacheTag: mocks.cacheTag,
  cacheLife: mocks.cacheLife,
}));

import { getStatsDb } from "@/db/stats";

const sql = createSqlMock();

beforeEach(() => {
  sql.reset();
  mocks.neon.mockReturnValue(sql.sql);
  vi.stubEnv("DATABASE_URL", "postgres://test");
});

describe("getStatsDb", () => {
  it("turns Postgres aggregate strings into numbers", async () => {
    sql.respond(() => [
      {
        name: "Jan",
        revenue: "150.50",
        invoices: "4",
        draft_invoices: "1",
        sent_invoices: "2",
        paid_invoices: "1",
        customers: "3",
        owing: "100",
      },
    ]);

    await expect(getStatsDb("org_1")).resolves.toEqual([
      {
        name: "Jan",
        revenue: 150.5,
        invoices: 4,
        draftInvoices: 1,
        sentInvoices: 2,
        paidInvoices: 1,
        customers: 3,
        owing: 100,
      },
    ]);
    expect(mocks.cacheLife).toHaveBeenCalledWith("hours");
    expect(mocks.cacheTag).toHaveBeenCalledWith("stats-org_1");
    expect(sql.calls[0].values).toEqual(["org_1"]);
    expect(sql.calls[0].text).toContain("AND i.org_id = ?");
  });

  it("fails without a database URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getStatsDb("org_1")).rejects.toThrow("Config Error");
  });
});
