import "./helpers/dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({
  auth: {
    signedIn: false,
    has: undefined as undefined | ((p: { feature: string }) => boolean),
  },
}));

vi.mock("@clerk/themes", () => ({ dark: {} }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ has: auth.has }),
  Show: ({ when, children }: { when: string; children: ReactNode }) =>
    (when === "signed-in") === auth.signedIn ? children : null,
  SignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignUpButton: () => <button type="button">Sign up</button>,
  SignOutButton: () => <button type="button">Sign out</button>,
  UserButton: () => <div data-testid="user-button" />,
  OrganizationSwitcher: () => <div data-testid="org-switcher" />,
}));

import { Navbar } from "@/components/navbar";

const desktopNav = () => screen.getAllByRole("navigation")[0];

describe("Navbar", () => {
  beforeEach(() => {
    auth.signedIn = false;
    auth.has = undefined;
  });

  it("links home and hides Stats while auth is loading", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "InvoicePro" })).toHaveAttribute(
      "href",
      "/",
    );
    const links = within(desktopNav())
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(links).toEqual([
      "Home",
      "Customers",
      "Products",
      "Invoices",
      "Plans",
    ]);
  });

  it("hides Stats without the stats feature", () => {
    auth.has = () => false;
    render(<Navbar />);
    expect(
      within(desktopNav()).queryByRole("link", { name: "Stats" }),
    ).not.toBeInTheDocument();
  });

  it("shows Stats with the stats feature", () => {
    const has = vi.fn(() => true);
    auth.has = has;
    render(<Navbar />);
    expect(
      within(desktopNav()).getByRole("link", { name: "Stats" }),
    ).toHaveAttribute("href", "/stats");
    expect(has).toHaveBeenCalledWith({ feature: "stats" });
  });

  it("offers sign in and sign up when signed out", () => {
    render(<Navbar />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.queryByTestId("user-button")).not.toBeInTheDocument();
  });

  it("shows the user and organization when signed in", () => {
    auth.signedIn = true;
    render(<Navbar />);
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
    expect(screen.getByTestId("org-switcher")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("opens the mobile menu and closes it when a link is picked", async () => {
    auth.signedIn = true;
    render(<Navbar />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveAccessibleName("InvoicePro");
    expect(
      within(sheet).getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
    expect(within(sheet).getByTestId("org-switcher")).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("link", { name: "Plans" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers sign in from the mobile menu when signed out", async () => {
    render(<Navbar />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const sheet = screen.getByRole("dialog");
    expect(
      within(sheet).getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(
      within(sheet).queryByRole("button", { name: "Sign out" }),
    ).not.toBeInTheDocument();
  });
});
