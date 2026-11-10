import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GitHubIcon } from "@/components/icons";

describe("GitHubIcon", () => {
  it("renders a labelled svg with the given class", () => {
    render(<GitHubIcon className="h-4" />);
    const icon = screen.getByRole("img", { name: "GitHub" });
    expect(icon).toHaveAttribute("class", "h-4");
    expect(icon.querySelector("path")).toBeTruthy();
  });
});
