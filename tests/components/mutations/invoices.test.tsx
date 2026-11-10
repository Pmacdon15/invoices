import type { UseMutationResult } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../helpers-forms/query";

const { actions, toast, push } = vi.hoisted(() => ({
  actions: {
    createInvoiceAction: vi.fn(),
    deleteInvoiceAction: vi.fn(),
    sendInvoiceAction: vi.fn(),
    updateInvoiceAction: vi.fn(),
    updateInvoiceStatusAction: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
  push: vi.fn(),
}));
vi.mock("@/actions/invoices", () => actions);
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import {
  useCreateInvoice,
  useDeleteInvoice,
  useSendInvoice,
  useUpdateInvoice,
  useUpdateInvoiceStatus,
} from "@/mutations/invoices";

const cases = [
  {
    name: "useCreateInvoice",
    hook: () => useCreateInvoice(),
    action: actions.createInvoiceAction,
    input: { customer_id: "c", items: [] },
    args: [{ customer_id: "c", items: [] }],
    success: "Invoice has been created",
  },
  {
    name: "useDeleteInvoice",
    hook: () => useDeleteInvoice(),
    action: actions.deleteInvoiceAction,
    input: "inv-1",
    args: ["inv-1"],
    success: "Invoice has been deleted",
  },
  {
    name: "useUpdateInvoiceStatus",
    hook: () => useUpdateInvoiceStatus(),
    action: actions.updateInvoiceStatusAction,
    input: { id: "inv-1", status: "paid" },
    args: ["inv-1", "paid"],
    success: "Invoice status has been updated",
  },
  {
    name: "useSendInvoice",
    hook: () => useSendInvoice(),
    action: actions.sendInvoiceAction,
    input: "inv-1",
    args: ["inv-1"],
    success: "Invoice sent! Status updated to Sent.",
  },
  {
    name: "useUpdateInvoice",
    hook: () => useUpdateInvoice(),
    action: actions.updateInvoiceAction,
    input: { id: "inv-1", items: [] },
    args: [{ id: "inv-1", items: [] }],
    success: "Invoice has been updated",
  },
] as const;

describe.each(cases)("$name", ({ hook, action, input, args, success }) => {
  beforeEach(() => action.mockReset());

  it("calls the action and toasts success", async () => {
    action.mockResolvedValue({ data: { id: "inv-1" } });
    const { result } = renderHook(
      hook as () => UseMutationResult<unknown, Error, unknown>,
      {
        wrapper: createWrapper(),
      },
    );

    // biome-ignore lint/suspicious/noExplicitAny: inputs differ per hook
    await act(() => result.current.mutateAsync(input as any));

    expect(action).toHaveBeenCalledWith(...args);
    await waitFor(() => expect(result.current.data).toEqual({ id: "inv-1" }));
    expect(toast.success).toHaveBeenCalledWith(success);
  });

  it("toasts the action's message on failure", async () => {
    action.mockResolvedValue({ message: "Broken" });
    const { result } = renderHook(
      hook as () => UseMutationResult<unknown, Error, unknown>,
      {
        wrapper: createWrapper(),
      },
    );

    // biome-ignore lint/suspicious/noExplicitAny: inputs differ per hook
    act(() => result.current.mutate(input as any));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Broken");
  });
});

describe("useCreateInvoice navigation", () => {
  beforeEach(() => actions.createInvoiceAction.mockReset());

  it("opens the new invoice", async () => {
    actions.createInvoiceAction.mockResolvedValue({ data: { id: "inv-9" } });
    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: createWrapper(),
    });
    // biome-ignore lint/suspicious/noExplicitAny: minimal input
    await act(() => result.current.mutateAsync({} as any));
    expect(push).toHaveBeenCalledWith("/invoices/inv-9");
  });

  it("stays put when the created invoice has no id", async () => {
    actions.createInvoiceAction.mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: createWrapper(),
    });
    // biome-ignore lint/suspicious/noExplicitAny: minimal input
    await act(() => result.current.mutateAsync({} as any));
    expect(push).not.toHaveBeenCalled();
  });
});

describe("useDeleteInvoice callbacks", () => {
  beforeEach(() => actions.deleteInvoiceAction.mockReset());

  it("calls onSuccess after deleting", async () => {
    actions.deleteInvoiceAction.mockResolvedValue({ data: { id: "i" } });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useDeleteInvoice({ onSuccess }), {
      wrapper: createWrapper(),
    });
    await act(() => result.current.mutateAsync("i"));
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("hands the error to onError instead of toasting", async () => {
    actions.deleteInvoiceAction.mockResolvedValue({ message: "Locked" });
    const onError = vi.fn();
    const { result } = renderHook(() => useDeleteInvoice({ onError }), {
      wrapper: createWrapper(),
    });
    act(() => result.current.mutate("i"));
    await waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError.mock.calls[0][0].message).toBe("Locked");
    expect(toast.error).not.toHaveBeenCalled();
  });
});
