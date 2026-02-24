import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/provider";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  title: "InvoicePro - Effortless Invoicing",
  description: "Manage customers, products, and invoices with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
        >
          <Providers>
            <div className="relative flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Toaster />
              <footer className="border-t py-6 md:px-8 md:py-0">
                <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4">
                  <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
                    Built for professionals. Patrick Macdonald @ 2026.
                  </p>
                </div>
              </footer>
            </div>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
