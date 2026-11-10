import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../helpers-forms/query";

const { actions, toast } = vi.hoisted(() => ({
  actions: {
    createCustomerAction: vi.fn(),
    deleteCustomerAction: vi.fn(),
    updateCustomerAction: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/actions/customers", () => actions);
vi.mock("sonner", () => ({ toast }));

import {
  useCreateCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/mutations/customers";

const cases = [
  {
    name: "useCreateCustomer",
    hook: useCreateCustomer,
    action: actions.createCustomerAction,
    input: { name: "Acme", email: "a@b.c" },
    success: "Customer has been created",
  },
  {
    name: "useDeleteCustomer",
    hook: useDeleteCustomer,
    action: actions.deleteCustomerAction,
    input: "cust-1",
    success: "Customer has been deleted",
  },
  {
    name: "useUpdateCustomer",
    hook: useUpdateCustomer,
    action: actions.updateCustomerAction,
    input: { id: "cust-1", name: "Acme" },
    success: "Customer has been updated",
  },
] as const;

describe.each(cases)("$name", ({ hook, action, input, success }) => {
  beforeEach(() => {
    action.mockReset();
  });

  it("returns the data and toasts success", async () => {
    action.mockResolvedValue({ data: { id: "cust-1" } });
    const { result } = renderHook(() => hook(), { wrapper: createWrapper() });

    await act(() =>
      // biome-ignore lint/suspicious/noExplicitAny: inputs differ per hook
      result.current.mutateAsync(input as any),
    );

    expect(action).toHaveBeenCalledWith(input);
    await waitFor(() => expect(result.current.data).toEqual({ id: "cust-1" }));
    expect(toast.success).toHaveBeenCalledWith(success);
  });

  it("throws the action's message and toasts it", async () => {
    action.mockResolvedValue({ message: "Not allowed" });
    const { result } = renderHook(() => hook(), { wrapper: createWrapper() });

    // biome-ignore lint/suspicious/noExplicitAny: inputs differ per hook
    act(() => result.current.mutate(input as any));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Not allowed");
    expect(toast.error).toHaveBeenCalledWith("Not allowed");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
