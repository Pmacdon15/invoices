import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { html2canvas, pdf, jsPDF } = vi.hoisted(() => {
  const pdf = {
    internal: { pageSize: { getWidth: () => 600 } },
    addImage: vi.fn(),
    save: vi.fn(),
  };
  return {
    html2canvas: vi.fn(),
    pdf,
    jsPDF: vi.fn(function JsPdf() {
      return pdf;
    }),
  };
});
vi.mock("html2canvas-pro", () => ({ default: html2canvas }));
vi.mock("jspdf", () => ({ default: jsPDF }));

import { DownloadPDFButton } from "@/components/buttons/download-pdf-button";

const canvas = { width: 300, height: 450, toDataURL: () => "data:png" };

function invoiceContent() {
  const el = document.createElement("div");
  el.id = "invoice-content";
  el.innerHTML =
    '<p style="color: oklch(0.5 0.1 200)">Total</p><span style="color: red">ok</span>';
  document.body.appendChild(el);
  return el;
}

/** A detached document like the one html2canvas hands to `onclone`. */
function clonedDocument(withContent = true) {
  const doc = document.implementation.createHTMLDocument("clone");
  const style = doc.createElement("style");
  style.innerHTML = ":root { --x: oklch(1 0 0); --y: lab(50 1 1); }";
  doc.head.appendChild(style);
  if (withContent) {
    const el = doc.createElement("div");
    el.id = "invoice-content";
    el.innerHTML =
      '<p style="color: oklch(0.5 0.1 200)">Total</p><span style="color: red">ok</span>';
    doc.body.appendChild(el);
  }
  return doc;
}

describe("DownloadPDFButton", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the invoice to a PDF named after the invoice id", async () => {
    const el = invoiceContent();
    let onclone: ((doc: Document) => void) | undefined;
    html2canvas.mockImplementation(async (_el, opts) => {
      onclone = opts.onclone;
      return canvas;
    });
    render(<DownloadPDFButton invoiceId="1234567890abcdef" />);
    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() =>
      expect(pdf.save).toHaveBeenCalledWith("invoice-12345678.pdf"),
    );
    expect(html2canvas).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ scale: 3, backgroundColor: "#ffffff" }),
    );
    expect(jsPDF).toHaveBeenCalledWith({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    // Height keeps the canvas aspect ratio at the page's width.
    expect(pdf.addImage).toHaveBeenCalledWith(
      "data:png",
      "PNG",
      0,
      0,
      600,
      900,
    );
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();

    // The clone gets colors html2canvas can parse and a fixed desktop width.
    const doc = clonedDocument();
    onclone?.(doc);
    const styles = Array.from(doc.getElementsByTagName("style"));
    expect(styles[0].innerHTML).not.toMatch(/oklch|lab\(/);
    expect(styles[0].innerHTML).toContain("#000000");
    expect(styles[1].innerHTML).toContain("--background: #ffffff !important;");
    const content = doc.getElementById("invoice-content") as HTMLElement;
    expect(content.style.width).toBe("960px");
    expect(content.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(doc.body.style.minWidth).toBe("960px");
    const p = content.querySelector("p") as HTMLElement;
    expect(p.getAttribute("style")).not.toContain("oklch");
    expect(p.style.getPropertyValue("--primary")).toBe("#18181b");
    expect(content.querySelector("span")?.getAttribute("style")).toContain(
      "red",
    );
  });

  it.each([
    ["INV-0042", "INV-0042.pdf"],
    ["#12345678", "invoice-12345678.pdf"],
  ])("names the PDF after the invoice label %s", async (label, filename) => {
    invoiceContent();
    html2canvas.mockResolvedValue(canvas);
    render(
      <DownloadPDFButton invoiceId="1234567890abcdef" invoiceLabel={label} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(pdf.save).toHaveBeenCalledWith(filename));
  });

  it("leaves a clone without invoice content alone after fixing styles", async () => {
    invoiceContent();
    let onclone: ((doc: Document) => void) | undefined;
    html2canvas.mockImplementation(async (_el, opts) => {
      onclone = opts.onclone;
      return canvas;
    });
    render(<DownloadPDFButton invoiceId="abc" />);
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(pdf.save).toHaveBeenCalled());
    const doc = clonedDocument(false);
    onclone?.(doc);
    expect(doc.body.style.width).toBe("");
    expect(doc.getElementsByTagName("style")).toHaveLength(2);
  });

  it("shows progress while generating", async () => {
    invoiceContent();
    let finish: (c: unknown) => void = () => {};
    html2canvas.mockReturnValue(
      new Promise((r) => {
        finish = r;
      }),
    );
    render(<DownloadPDFButton invoiceId="abc" />);
    await userEvent.click(screen.getByRole("button"));
    const busy = screen.getByRole("button", { name: "Generating..." });
    expect(busy).toBeDisabled();
    finish(canvas);
    expect(
      await screen.findByRole("button", { name: "Download PDF" }),
    ).toBeEnabled();
  });

  it("logs and stops when the invoice isn't on the page", async () => {
    render(<DownloadPDFButton invoiceId="abc" />);
    await userEvent.click(screen.getByRole("button"));
    expect(console.error).toHaveBeenCalledWith("Invoice content not found");
    expect(html2canvas).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("alerts the user when generation fails", async () => {
    invoiceContent();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    html2canvas.mockRejectedValue(new Error("boom"));
    render(<DownloadPDFButton invoiceId="abc" />);
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "Failed to generate PDF. Please try again.",
      ),
    );
    expect(console.error).toHaveBeenCalledWith(
      "PDF Generation Error:",
      expect.any(Error),
    );
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });
});
