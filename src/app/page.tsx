import { ArrowRight, Plus, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const stats = [
    { value: "10k+", label: "Invoices Created" },
    { value: "2.5k", label: "Happy Users" },
    { value: "99%", label: "Uptime" },
    { value: "24/7", label: "Support" },
  ];

  const workflow = [
    {
      step: "01",
      title: "Add Your Customers",
      description:
        "Build your client database with detailed contact information and billing preferences. Track every interaction and maintain lasting relationships.",
      href: "/customers",
    },
    {
      step: "02",
      title: "Catalog Your Products",
      description:
        "Create a comprehensive product catalog with pricing, descriptions, and categories. Update inventory and manage your offerings effortlessly.",
      href: "/products",
    },
    {
      step: "03",
      title: "Generate Invoices",
      description:
        "Combine customers and products to create professional invoices in seconds. Track payments, send reminders, and stay organized.",
      href: "/invoices",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section - Bold Typography */}
      <section className="relative overflow-hidden bg-sidebar text-sidebar-foreground min-h-[70vh] flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-5xl">
            <p className="text-sidebar-primary font-medium tracking-widest uppercase text-sm mb-6">
              Invoice Management Platform
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] mb-8">
              Invoicing
              <br />
              <span className="text-sidebar-primary">made simple.</span>
            </h1>
            <p className="text-xl md:text-2xl text-sidebar-foreground/70 max-w-xl mb-10 leading-relaxed">
              The all-in-one platform for managing customers, products, and
              professional invoices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white px-8 h-14 text-lg"
              >
                <Link href="/invoices/new" className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Invoice
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="text-sidebar-foreground hover:bg-sidebar-accent h-14 text-lg"
              >
                <Link href="/plans" className="flex items-center gap-2">
                  View Plans
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-4xl md:text-5xl mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-primary-foreground/70 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section - Alternating Layout */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">
              How It Works
            </p>
            <h2 className="font-serif text-4xl md:text-5xl">
              Three steps to streamlined invoicing
            </h2>
          </div>

          <div className="space-y-24">
            {workflow.map((item, index) => (
              <div
                key={item.step}
                className={`flex flex-col ${index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} gap-12 items-center`}
              >
                <div className="flex-1">
                  <div className="text-8xl font-serif text-muted-foreground/20 mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-serif text-3xl md:text-4xl mb-4">
                    {item.title}
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    {item.description}
                  </p>
                  <Link
                    href={item.href as Route}
                    className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
                  >
                    Get Started <ChevronRight className="h-5 w-5" />
                  </Link>
                </div>
                <div className="flex-1 w-full">
                  <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-muted to-muted/50 border flex items-center justify-center">
                    <div className="text-6xl font-serif text-muted-foreground/30">
                      {item.step}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-8">
            Recognition
          </p>
          <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl leading-relaxed mb-8">
            &ldquo;Simple, powerful, and exactly what we needed for our growing
            business.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-serif text-primary">PM</span>
            </div>
            <div className="text-left">
              <div className="font-medium text-sm">Patrick Macdonald</div>
              <div className="text-xs text-muted-foreground">Founder</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-4xl md:text-5xl mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg text-sidebar-foreground/70 mb-10 max-w-xl mx-auto">
            Join thousands of businesses managing their invoices with ease.
          </p>
          <Link href="/customers">
            <Button
              size="lg"
              className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white px-12 h-14 text-lg"
            >
              Start Free Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
