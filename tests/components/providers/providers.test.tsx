import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("@tanstack/react-query");
  vi.resetModules();
});

describe("getQueryClient", () => {
  it("reuses one client in the browser with a one-minute stale time", async () => {
    const { getQueryClient } = await import(
      "@/components/providers/get-query-client"
    );
    const client = getQueryClient();
    expect(getQueryClient()).toBe(client);
    expect(client.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

  it("dehydrates successful and pending queries but not failed ones", async () => {
    const { getQueryClient } = await import(
      "@/components/providers/get-query-client"
    );
    const shouldDehydrate = getQueryClient().getDefaultOptions().dehydrate
      ?.shouldDehydrateQuery as (q: unknown) => boolean;
    const query = (status: string) => ({ state: { status } });
    expect(shouldDehydrate(query("success"))).toBe(true);
    expect(shouldDehydrate(query("pending"))).toBe(true);
    expect(shouldDehydrate(query("error"))).toBe(false);
  });

  it("makes a new client for every server request", async () => {
    vi.doMock("@tanstack/react-query", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@tanstack/react-query")>()),
      isServer: true,
    }));
    const { getQueryClient } = await import(
      "@/components/providers/get-query-client"
    );
    expect(getQueryClient()).not.toBe(getQueryClient());
  });
});

describe("Providers", () => {
  it("gives children the shared query client", async () => {
    const { default: Providers } = await import(
      "@/components/providers/provider"
    );
    const { getQueryClient } = await import(
      "@/components/providers/get-query-client"
    );
    let seen: unknown;
    function Probe() {
      seen = useQueryClient();
      return <p>child</p>;
    }
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(seen).toBe(getQueryClient());
  });
});
