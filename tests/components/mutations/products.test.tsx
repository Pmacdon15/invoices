import type { UseMutationResult } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../helpers-forms/query";

const { actions, toast } = vi.hoisted(() => ({
  actions: {
    createProductAction: vi.fn(),
    deleteProductAction: vi.fn(),
    updateProductAction: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/actions/products", () => actions);
vi.mock("sonner", () => ({ toast }));

import {
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from "@/mutations/products";

const cases = [
  {
    name: "useCreateProduct",
    hook: () => useCreateProduct(),
    action: actions.createProductAction,
    input: { name: "Widget", price: 5 },
    success: "Product created!",
  },
  {
    name: "useDeleteProduct",
    hook: () => useDeleteProduct(),
    action: actions.deleteProductAction,
    input: "prod-1",
    success: "Product has been deleted",
  },
  {
    name: "useUpdateProduct",
    hook: () => useUpdateProduct(),
    action: actions.updateProductAction,
    input: { id: "prod-1", name: "Widget" },
    success: "Product has been updated",
  },
] as const;

describe.each(cases)("$name", ({ hook, action, input, success }) => {
  beforeEach(() => action.mockReset());

  it("returns the data and toasts success", async () => {
    action.mockResolvedValue({ data: { id: "prod-1" } });
    const { result } = renderHook(
      hook as () => UseMutationResult<unknown, Error, unknown>,
      {
        wrapper: createWrapper(),
      },
    );

    // biome-ignore lint/suspicious/noExplicitAny: inputs differ per hook
    await act(() => result.current.mutateAsync(input as any));

    expect(action).toHaveBeenCalledWith(input);
    await waitFor(() => expect(result.current.data).toEqual({ id: "prod-1" }));
    expect(toast.success).toHaveBeenCalledWith(success);
  });

  it("toasts the action's message on failure", async () => {
    action.mockResolvedValue({ message: "Nope" });
    const { result } = renderHook(
      hook as () => UseMutationResult<unknown, Error, unknown>,
      {
        wrapper: createWrapper(),
      },
    );

    // biome-ignore lint/suspicious/noExplicitAny: inputs differ per hook
    act(() => result.current.mutate(input as any));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Nope");
  });
});

describe("useDeleteProduct callbacks", () => {
  beforeEach(() => actions.deleteProductAction.mockReset());

  it("calls onSuccess after deleting", async () => {
    actions.deleteProductAction.mockResolvedValue({ data: { id: "p" } });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useDeleteProduct({ onSuccess }), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.mutateAsync("p"));
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("hands the error to onError instead of toasting", async () => {
    actions.deleteProductAction.mockResolvedValue({ message: "In use" });
    const onError = vi.fn();
    const { result } = renderHook(() => useDeleteProduct({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => result.current.mutate("p"));

    await waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError.mock.calls[0][0].message).toBe("In use");
    expect(toast.error).not.toHaveBeenCalled();
  });
});
