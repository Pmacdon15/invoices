import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getInvoices } from "@/dal/invoices";
import { InvoicesTable } from "./invoices-table";

export default async function InvoicesPage() {
  const invoicesPromise = getInvoices();

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Managing your billing and payments.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Create Invoice
          </Link>
        </Button>
      </div>
      <Suspense>
        <InvoicesTable invoicesPromise={invoicesPromise} />
      </Suspense>
    </div>
  );
}
