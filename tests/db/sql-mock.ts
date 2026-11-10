import { vi } from "vitest";

export type SqlCall = { text: string; values: unknown[] };

/**
 * A stand-in for the `sql` tagged template that `neon()` returns. Every call
 * (including nested fragments such as a WHERE clause) is recorded with its
 * whitespace-collapsed text, and answered by `respond`, which tests set to
 * return rows for the queries they care about. Unanswered queries get `[]`.
 */
export function createSqlMock() {
  const calls: SqlCall[] = [];
  let respond: (call: SqlCall) => unknown = () => undefined;

  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const call = {
      text: strings.join("?").replace(/\s+/g, " ").trim(),
      values,
    };
    calls.push(call);
    const result = respond(call);
    if (result instanceof Error) return Promise.reject(result);
    return Promise.resolve(result ?? []);
  });

  return {
    sql,
    calls,
    /** Queries only, without nested fragments (those start with WHERE). */
    queries: () => calls.filter((c) => !c.text.startsWith("WHERE")),
    respond(fn: (call: SqlCall) => unknown) {
      respond = fn;
    },
    reset() {
      calls.length = 0;
      respond = () => undefined;
      sql.mockClear();
    },
  };
}
