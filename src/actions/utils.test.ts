import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import { handleMutationError } from "./utils";

describe("handleMutationError", () => {
  beforeEach(() => redirect.mockReset());

  it("returns usage limit details to the caller", () => {
    const result = handleMutationError({
      reason:
        "Usage limit reached, limit: 5 a month with your plan. Consider upgrading.",
    });
    expect(result).toEqual({
      message:
        "Usage limit reached, limit: 5 a month with your plan. Consider upgrading.",
    });
  });

  it("returns validation details with the validation message", () => {
    const errors = { properties: { name: { errors: ["Required"] } } };
    expect(
      handleMutationError({ reason: "Validation failed", errors }),
    ).toEqual({
      message: "Data validation on submitted data has failed",
      errors,
    });
  });

  it("redirects unauthorized users to the home page", () => {
    expect(handleMutationError({ reason: "Not authorized" })).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it.each([
    "Failed to verify limits",
    "Customer not found or is disabled",
    "One or more products are not found or are disabled",
    "Over organization membership limit",
    "Db failed to create invoice",
    "Db failed to update customer",
    "Failed to send invoice",
  ] as const)("returns a message for %s", (reason) => {
    expect(handleMutationError({ reason })).toEqual({ message: reason });
  });

  it("rejects an unhandled error reason", () => {
    expect(() =>
      handleMutationError({ reason: "unexpected" as "Test" }),
    ).toThrow("Unhandled error reason: unexpected");
  });
});
