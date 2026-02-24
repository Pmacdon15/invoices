import { auth } from "@clerk/nextjs/server";
import { ChevronLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { InvoiceDetails } from "@/components/invoice-details";
import { Button } from "@/components/ui/button";
import { getBranding } from "@/dal/brandings";
import { getInvoiceById } from "@/dal/invoices";

export default function InvoicePage(props: PageProps<"/invoices/[id]">) {
  const invoicePromise = props.params.then((p) => getInvoiceById(p.id));
  const brandingPromise = getBranding();
 
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

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-20">
            <CreditCard className="h-10 w-10 animate-pulse text-muted" />
          </div>
        }
      >
        <InvoiceDetails
          invoicePromise={invoicePromise}
          brandingPromise={brandingPromise}
        />
      </Suspense>
    </div>
  );
}
