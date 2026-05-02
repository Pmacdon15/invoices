"use client";
import {
  OrganizationSwitcher,
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Menu, ReceiptText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { title: "Home", href: "/" },
  { title: "Customers", href: "/customers" },
  { title: "Products", href: "/products" },
  { title: "Invoices", href: "/invoices" },
  { title: "Stats", href: "/stats" },
  { title: "Plans", href: "/plans" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { has } = useAuth();

  const hasStats = has ? has({ feature: "stats" }) : false;
  const filteredNavItems = navItems.filter((item) => {
    if (item.title === "Stats" && !hasStats) return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-50 w-full bg-sidebar text-sidebar-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <ReceiptText className="h-6 w-6 text-sidebar-primary" />
            <span className="inline-block font-serif text-xl tracking-tight">
              InvoicePro
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <nav className="flex items-center gap-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.title}
                href={item.href as Route}
                className="px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </nav>

          <Show when={"signed-out"}>
            <SignInButton>
              <Button className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton />
          </Show>
          <Show when={"signed-in"}>
            <div className="flex items-center gap-4">
              <UserButton appearance={{ theme: dark }} />
              <OrganizationSwitcher
                appearance={{ theme: dark }}
                afterCreateOrganizationUrl="/dashboard"
              />
            </div>
          </Show>
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="p-0 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Menu size={24} />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="pl-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5" />
                  InvoicePro
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4">
                <Show when={"signed-in"}>
                  <OrganizationSwitcher />
                </Show>
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href as Route}
                    className="text-lg font-medium hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                <hr className="my-2" />
                <Show when={"signed-out"}>
                  <SignInButton>
                    <Button>Sign in</Button>
                  </SignInButton>
                  <SignUpButton />
                </Show>
                <Show when={"signed-in"}>
                  <div className="flex items-center gap-4">
                    <SignOutButton />
                  </div>
                </Show>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
