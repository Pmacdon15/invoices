import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { GitHubIcon } from "./icons";

export function Footer() {
  return (
    <footer className="border-t py-8 mt-12 bg-card">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold tracking-tight">InvoicePro</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Built for professionals by Patrick Macdonald © 2026.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link
              href="https://github.com/pmacdon15"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <GitHubIcon className="h-5 w-5" />
              <span>pmacdon15</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
