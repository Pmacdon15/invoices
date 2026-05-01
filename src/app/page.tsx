import { ArrowRight, Package, Receipt, Users, Plus, LayoutGrid, CheckCircle2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const actions = [
    {
      title: "Customers",
      description:
        "Manage your client database, add new customers and view history.",
      icon: Users,
      href: "/customers",
      color: "bg-blue-500",
    },
    {
      title: "Products",
      description: "Keep track of your offerings and set standard pricing.",
      icon: Package,
      href: "/products",
      color: "bg-teal-500",
    },
    {
      title: "Invoices",
      description: "Generate professional invoices and track payment status.",
      icon: Receipt,
      href: "/invoices",
      color: "bg-amber-500",
    },
  ];

  const features = [
    "Professional invoice templates",
    "Customer relationship management",
    "Product catalog organization",
    "Real-time analytics dashboard",
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section with Navy Background */}
      <section className="bg-sidebar text-sidebar-foreground py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-sidebar-primary mb-4">
            Invoice Management Platform
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl mb-6 text-balance">
            Streamline Your Business Invoicing
          </h1>
          <p className="text-lg text-sidebar-foreground/80 max-w-2xl mx-auto mb-8">
            The all-in-one platform for managing customers, products, and
            professional invoices. Built for efficiency and ease of use.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground px-8"
            >
              <Link href="/invoices/new" className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Invoice
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="px-8 border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Link href="/customers" className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                View Customers
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Cards Section */}
      <section className="py-16 px-4 container mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-2">
            Core Features
          </p>
          <h2 className="font-serif text-3xl md:text-4xl">
            Everything you need to manage your business
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {actions.map((action) => (
            <Card
              key={action.title}
              className="hover:shadow-xl transition-all duration-300 border group hover:-translate-y-1"
            >
              <CardHeader>
                <div
                  className={`${action.color} p-3 rounded-xl w-fit mb-3 text-white shadow-lg`}
                >
                  <action.icon className="h-6 w-6" />
                </div>
                <CardTitle className="font-serif text-xl">{action.title}</CardTitle>
                <CardDescription className="text-base">{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="link"
                  className="p-0 text-primary group-hover:translate-x-1 transition-transform"
                >
                  <Link
                    href={action.href as Route}
                    className="flex items-center gap-1"
                  >
                    Go to {action.title} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="bg-primary rounded-2xl p-8 md:p-12 text-primary-foreground">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flex flex-col gap-6">
                <h2 className="font-serif text-3xl md:text-4xl">Ready to grow your business?</h2>
                <p className="text-primary-foreground/80 text-lg">
                  Take control of your daily business operations with a tool built
                  for your professional needs.
                </p>
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-teal-300 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex md:justify-end">
                <Link href={"/customers"}>
                  <Button 
                    size="lg" 
                    className="bg-white text-primary hover:bg-white/90 rounded-full px-10 h-14 text-lg font-medium shadow-lg"
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
