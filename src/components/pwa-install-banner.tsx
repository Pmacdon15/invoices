"use client";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const DISMISS_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function PwaInstallBanner() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (isStandalone() || wasDismissed()) return;

    if (isIos()) setShowIosHint(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || (!installEvent && !showIosHint)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setHidden(true);
  };

  const install = async (event: BeforeInstallPromptEvent) => {
    await event.prompt();
    const { outcome } = await event.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setHidden(true);
  };

  return (
    <section
      aria-label="Install InvoicePro"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm sm:p-0"
    >
      <div className="flex items-start gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">Install InvoicePro</p>
          {installEvent ? (
            <>
              <p className="text-xs text-muted-foreground">
                Add the app to your device for quick, full-screen access.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => install(installEvent)}>
                  Install
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Not now
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
              <span className="font-medium">Share</span>, then{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install banner"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
