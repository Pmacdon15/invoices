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
import { Menu, ReceiptText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
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
    <header className="sticky top-0 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <ReceiptText className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold text-xl tracking-tight">
              InvoicePro
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <NavigationMenu>
            <NavigationMenuList>
              {filteredNavItems.map((item) => (
                <NavigationMenuItem key={item.title}>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                  >
                    <Link href={item.href as Route}>{item.title}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <Show when={"signed-out"}>
            <SignInButton>
              <Button>Sign in</Button>
            </SignInButton>
            <SignUpButton />
          </Show>
          <Show when={"signed-in"}>
            <div className="flex items-center gap-4">
              <UserButton />
              <OrganizationSwitcher afterCreateOrganizationUrl="/dashboard" />
            </div>
          </Show>
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="p-0">
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
