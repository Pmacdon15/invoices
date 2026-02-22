import { ArrowRight, Package, Receipt, Users } from "lucide-react";
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
      color: "text-blue-500",
    },
    {
      title: "Products",
      description: "Keep track of your offerings and set standard pricing.",
      icon: Package,
      href: "/products",
      color: "text-green-500",
    },
    {
      title: "Invoices",
      description: "Generate professional invoices and track payment status.",
      icon: Receipt,
      href: "/invoices",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="flex flex-col gap-12 py-12 px-4 container mx-auto">
      <section className="flex flex-col items-center text-center gap-4 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Streamline Your{" "}
          <span className="text-primary text-blue-600">Invoicing</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          The all-in-one platform for managing customers, products, and
          professional invoices. Built for efficiency and ease of use.
        </p>
        <div className="flex gap-4 mt-4">
          <Button
            asChild
            size="lg"
            className="px-8 bg-blue-600 hover:bg-blue-700"
          >
            <Link href="/invoices/new">Create Invoice</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8">
            <Link href="/customers">View Customers</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actions.map((action) => (
          <Card
            key={action.title}
            className="hover:shadow-lg transition-shadow border-2 group"
          >
            <CardHeader>
              <div
                className={`p-2 rounded-lg w-fit mb-2 ${action.color} bg-opacity-10 bg-current`}
              >
                <action.icon className="h-6 w-6" />
              </div>
              <CardTitle>{action.title}</CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="link"
                className="p-0 group-hover:translate-x-1 transition-transform"
              >
                <Link href={action.href} className="flex items-center gap-1">
                  Go to {action.title} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 md:p-12 border">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-bold">Ready to grow?</h2>
            <p className="text-muted-foreground text-lg">
              Join thousands of professionals who trust InvoicePro for their
              daily business operations.
            </p>
            <div className="flex gap-2 items-center text-sm font-medium">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white dark:border-slate-800"
                  />
                ))}
              </div>
              <span>Trusted by 500+ businesses</span>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="lg" className="rounded-full px-12 h-14 text-lg">
              Get Started Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
