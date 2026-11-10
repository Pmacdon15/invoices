import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISMISS_KEY, PwaInstallBanner } from "@/components/pwa-install-banner";

const originalUA = navigator.userAgent;

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

function setStandalone(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as never;
}

function firePrompt(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe("PwaInstallBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    setStandalone(false);
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/130");
  });

  afterEach(() => {
    setUserAgent(originalUA);
    // biome-ignore lint/suspicious/noExplicitAny: test cleanup
    delete (navigator as any).serviceWorker;
    // biome-ignore lint/suspicious/noExplicitAny: test cleanup
    delete (navigator as any).standalone;
    vi.restoreAllMocks();
  });

  it("renders nothing until the browser offers an install prompt", () => {
    render(<PwaInstallBanner />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("registers the service worker when supported", () => {
    const register = vi.fn().mockReturnValue(Promise.reject(new Error("x")));
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });
    render(<PwaInstallBanner />);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("shows an install button that triggers the native prompt", async () => {
    render(<PwaInstallBanner />);
    const event = firePrompt("accepted");
    await userEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(event.prompt).toHaveBeenCalled();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("hides the banner when the user cancels the native prompt", async () => {
    render(<PwaInstallBanner />);
    firePrompt("dismissed");
    await userEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISS_KEY)).toBeNull();
  });

  it("remembers when the user dismisses it", async () => {
    const { unmount } = render(<PwaInstallBanner />);
    firePrompt();
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISS_KEY)).toBe("1");
    unmount();

    render(<PwaInstallBanner />);
    firePrompt();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("hides once the app is installed", () => {
    render(<PwaInstallBanner />);
    firePrompt();
    expect(screen.getByRole("region")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("shows Add to Home Screen instructions on iOS", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    render(<PwaInstallBanner />);
    expect(screen.getByRole("region")).toHaveTextContent("Add to Home Screen");
    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss install banner" }),
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("does not show when already running as an installed app", () => {
    setStandalone(true);
    render(<PwaInstallBanner />);
    firePrompt();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("does not show in iOS standalone mode", () => {
    window.matchMedia = undefined as never;
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    Object.defineProperty(navigator, "standalone", {
      value: true,
      configurable: true,
    });
    render(<PwaInstallBanner />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("still works when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<PwaInstallBanner />);
    firePrompt();
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("offers no Install button on iOS without a prompt event", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    render(<PwaInstallBanner />);
    expect(
      screen.queryByRole("button", { name: "Install" }),
    ).not.toBeInTheDocument();
  });
});
