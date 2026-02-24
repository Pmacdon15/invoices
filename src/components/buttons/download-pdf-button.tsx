"use client";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DownloadPDFButtonProps {
  invoiceId: string;
}

// Regex to match any modern CSS color function that html2canvas can't parse
const UNSUPPORTED_COLOR_RE = /(oklch|oklab|lab|lch)\([^)]*\)/g;

// A safe fallback map for known CSS variable names -> hex
const CSS_VAR_HEX: Record<string, string> = {
  "--background": "#ffffff",
  "--foreground": "#09090b",
  "--card": "#ffffff",
  "--card-foreground": "#09090b",
  "--popover": "#ffffff",
  "--popover-foreground": "#09090b",
  "--primary": "#18181b",
  "--primary-foreground": "#fafafa",
  "--secondary": "#f4f4f5",
  "--secondary-foreground": "#18181b",
  "--muted": "#f4f4f5",
  "--muted-foreground": "#71717a",
  "--accent": "#f4f4f5",
  "--accent-foreground": "#18181b",
  "--destructive": "#ef4444",
  "--border": "#e4e4e7",
  "--input": "#e4e4e7",
  "--ring": "#71717a",
};

export function DownloadPDFButton({ invoiceId }: DownloadPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById("invoice-content");

    if (!element) {
      console.error("Invoice content not found");
      setIsGenerating(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // --- 1. Strip unsupported colors from all <style> tags ---
          const styleTags = clonedDoc.getElementsByTagName("style");
          for (const tag of Array.from(styleTags)) {
            tag.innerHTML = tag.innerHTML.replace(
              UNSUPPORTED_COLOR_RE,
              "#000000",
            );
          }

          // --- 2. Inject a style override block with safe hex values ---
          const overrideStyle = clonedDoc.createElement("style");
          overrideStyle.innerHTML = `
            :root {
              ${Object.entries(CSS_VAR_HEX)
                .map(([k, v]) => `${k}: ${v} !important;`)
                .join("\n")}
            }
          `;
          clonedDoc.head.appendChild(overrideStyle);

          // --- 3. Walk every element and fix inline styles ---
          const clonedElement = clonedDoc.getElementById("invoice-content");
          if (!clonedElement) return;

          // Force desktop layout — prevent mobile/responsive breakpoints
          const DESKTOP_WIDTH = 960;
          clonedDoc.documentElement.style.width = `${DESKTOP_WIDTH}px`;
          clonedDoc.body.style.width = `${DESKTOP_WIDTH}px`;
          clonedDoc.body.style.minWidth = `${DESKTOP_WIDTH}px`;
          clonedElement.style.width = `${DESKTOP_WIDTH}px`;
          clonedElement.style.minWidth = `${DESKTOP_WIDTH}px`;
          clonedElement.style.maxWidth = `${DESKTOP_WIDTH}px`;

          clonedElement.style.backgroundColor = "#ffffff";
          clonedElement.style.padding = "40px";
          clonedElement.style.borderRadius = "0px";

          const allEls = [
            clonedElement,
            ...Array.from(clonedElement.getElementsByTagName("*")),
          ] as HTMLElement[];

          for (const el of allEls) {
            // Apply the CSS variable overrides as inline props
            for (const [key, val] of Object.entries(CSS_VAR_HEX)) {
              el.style.setProperty(key, val, "important");
            }

            // Scrub any inline style attribute that contains unsupported colors
            const inlineStyle = el.getAttribute("style") ?? "";
            if (UNSUPPORTED_COLOR_RE.test(inlineStyle)) {
              el.setAttribute(
                "style",
                inlineStyle.replace(UNSUPPORTED_COLOR_RE, "#000000"),
              );
            }
            // Reset the regex lastIndex (since we use the global flag)
            UNSUPPORTED_COLOR_RE.lastIndex = 0;
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoiceId.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={downloadPDF}
      disabled={isGenerating}
      variant="outline"
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isGenerating ? "Generating..." : "Download PDF"}
    </Button>
  );
}
