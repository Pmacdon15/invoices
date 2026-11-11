import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../helpers-forms/query";

const { action, toast } = vi.hoisted(() => ({
  action: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/actions/org-settings", () => ({
  updateInvoicePrefixAction: action,
}));
vi.mock("sonner", () => ({ toast }));

import { useUpdateInvoicePrefix } from "@/mutations/org-settings";

beforeEach(() => {
  action.mockReset();
});

describe("useUpdateInvoicePrefix", () => {
  it("saves the prefix and says so", async () => {
    action.mockResolvedValue({ data: { invoice_prefix: "ACME" } });
    const { result } = renderHook(() => useUpdateInvoicePrefix(), {
      wrapper: createWrapper(),
    });
    act(() => result.current.mutate("ACME"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(action).toHaveBeenCalledWith("ACME");
    expect(result.current.data).toEqual({ invoice_prefix: "ACME" });
    expect(toast.success).toHaveBeenCalledWith(
      "Invoice prefix has been updated",
    );
  });

  it("shows the action's error", async () => {
    action.mockResolvedValue({ message: "Admins only" });
    const { result } = renderHook(() => useUpdateInvoicePrefix(), {
      wrapper: createWrapper(),
    });
    act(() => result.current.mutate("X"));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Admins only");
  });
});
