import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { GitHubIcon } from "./icons";

export function Footer() {
  return (
    <footer className="py-10 mt-12 bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-sidebar-primary" />
              <p className="text-sm font-serif tracking-tight">InvoicePro</p>
            </div>
            <p className="text-xs text-sidebar-foreground/60">
              Built for professionals by Patrick Macdonald © 2026.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 text-sm text-sidebar-foreground/70">
            <div className="flex items-center gap-6">
              <Link href="/terms" className="hover:text-sidebar-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-sidebar-foreground transition-colors">
                Privacy
              </Link>
            </div>
            
            <div className="flex items-center gap-4 border-l pl-6 border-sidebar-foreground/20">
              <span className="text-[10px] uppercase tracking-widest font-bold text-sidebar-foreground/40">Attribution</span>
              <Link
                href="https://github.com/pmacdon15"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-sidebar-foreground transition-colors"
              >
                <GitHubIcon className="h-5 w-5" />
                <span className="font-medium">pmacdon15</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
