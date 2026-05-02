import {
  ArrowRight,
  ChevronRight,
  Clock,
  FileText,
  Package,
  Plus,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const highlights = [
    { icon: Zap, label: "Fast & Lightweight" },
    { icon: Shield, label: "Secure by Default" },
    { icon: Clock, label: "Save Hours Weekly" },
  ];

  const workflow = [
    {
      step: "01",
      title: "Add Your Customers",
      description:
        "Build your client database with detailed contact information and billing preferences. Track every interaction and maintain lasting relationships.",
      href: "/customers",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      step: "02",
      title: "Catalog Your Products",
      description:
        "Create a comprehensive product catalog with pricing, descriptions, and categories. Update inventory and manage your offerings effortlessly.",
      href: "/products",
      icon: Package,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      step: "03",
      title: "Generate Invoices",
      description:
        "Combine customers and products to create professional invoices in seconds. Track payments, send reminders, and stay organized.",
      href: "/invoices",
      icon: FileText,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
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

      {/* Highlights Strip */}
      <section className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {highlights.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium tracking-wide">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section - Enhanced Visuals */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl pointer-events-none opacity-50">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center p-1 rounded-full bg-primary/10 mb-4">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary bg-background rounded-full shadow-sm">
                The Process
              </span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6">
              Three steps to streamlined invoicing
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We've simplified the entire workflow so you can focus on what
              matters most: growing your business and getting paid on time.
            </p>
          </div>

          <div className="space-y-32">
            {workflow.map((item, index) => (
              <div
                key={item.step}
                className={`flex flex-col ${index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} gap-16 items-center`}
              >
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-serif text-primary/20">
                      {item.step}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="font-serif text-4xl md:text-5xl">
                    {item.title}
                  </h3>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                  <Link
                    href={item.href as Route}
                    className="inline-flex items-center gap-2 text-primary font-semibold text-lg group"
                  >
                    Get Started
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
                <div className="flex-1 w-full group">
                  <div className="relative aspect-[4/3] rounded-3xl bg-card border shadow-xl overflow-hidden flex items-center justify-center p-12 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                    <div
                      className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${item.color.replace("text-", "from-")} to-transparent`}
                    />
                    <div
                      className={`absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]`}
                    />

                    <div className="flex flex-col items-center text-center relative z-10">
                      <div
                        className={`h-28 w-28 rounded-3xl ${item.bgColor} flex items-center justify-center mb-8 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
                      >
                        <item.icon className={`h-14 w-14 ${item.color}`} />
                      </div>
                      <div className="space-y-3 w-full max-w-[240px]">
                        <div className="h-2.5 w-full bg-muted/60 rounded-full" />
                        <div className="h-2.5 w-3/4 bg-muted/40 rounded-full mx-auto" />
                        <div className="h-2.5 w-1/2 bg-muted/20 rounded-full mx-auto" />
                      </div>
                    </div>

                    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-8 font-bold">
            Recognition
          </p>
          <blockquote className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight mb-10 italic">
            &ldquo;Simple, powerful, and exactly what we needed for our growing
            business.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <h2 className="font-serif text-5xl md:text-6xl mb-8 leading-tight">
            Ready to get started?
          </h2>
          <p className="text-xl text-sidebar-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            Create your first invoice in minutes. Join thousands of businesses
            who trust us with their billing.
          </p>
          <Link href="/customers">
            <Button
              size="lg"
              className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white px-12 h-16 text-xl rounded-full shadow-xl hover:shadow-sidebar-primary/20 transition-all"
            >
              Start Free Today
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
