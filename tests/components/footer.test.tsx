import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/footer";

describe("Footer", () => {
  it("links to the terms and privacy pages", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("InvoicePro");
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByText(/© 2026/)).toBeInTheDocument();
  });
});
