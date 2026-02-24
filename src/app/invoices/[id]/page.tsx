import { ChevronLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { InvoiceDetails } from "@/components/invoice-details";
import { Button } from "@/components/ui/button";
import { getInvoiceById } from "@/dal/invoices";

export default function InvoicePage(props: PageProps<"/invoices/[id]">) {
  // const invoicePromise = props.params.then((p) => getInvoiceById(p.id));

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          asChild
          variant="ghost"
          className="-ml-4 text-muted-foreground hover:text-foreground"
        >
          <Link href="/invoices" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Back to Invoices
          </Link>
        </Button>
      </div>

    
    </div>
  );
}
