import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useTheme, Sonner } = vi.hoisted(() => ({
  useTheme: vi.fn(),
  Sonner: vi.fn((_props: Record<string, unknown>) => null),
}));
vi.mock("next-themes", () => ({ useTheme }));
vi.mock("sonner", () => ({ Toaster: Sonner }));

import { Toaster } from "@/components/ui/sonner";

const lastProps = () =>
  Sonner.mock.calls.at(-1)?.[0] as {
    theme: string;
    icons: Record<string, ReactNode>;
    style: Record<string, string>;
    position?: string;
  };

describe("Toaster", () => {
  beforeEach(() => Sonner.mockClear());

  it("uses the current theme", () => {
    useTheme.mockReturnValue({ theme: "dark" });
    render(<Toaster position="top-center" />);
    const props = lastProps();
    expect(props.theme).toBe("dark");
    expect(props.position).toBe("top-center");
    expect(Object.keys(props.icons).sort()).toEqual([
      "error",
      "info",
      "loading",
      "success",
      "warning",
    ]);
    expect(props.style["--normal-bg"]).toBe("var(--popover)");
  });

  it("falls back to the system theme", () => {
    useTheme.mockReturnValue({});
    render(<Toaster />);
    expect(lastProps().theme).toBe("system");
  });
});
