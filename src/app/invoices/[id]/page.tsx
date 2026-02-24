import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  FileText,
  Package,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DownloadPDFButton } from "@/components/buttons/download-pdf-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranding } from "@/dal/brandings";
import { getInvoiceById } from "@/dal/invoices";
import { InvoiceStatusUpdater } from "./status-updater";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoicePromise = getInvoiceById(id);

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
        <InvoiceDetails invoicePromise={invoicePromise} />
      </Suspense>
    </div>
  );
}

async function InvoiceDetails({
  invoicePromise,
}: {
  invoicePromise: Promise<{ data: any | null; error: string | null }>;
}) {
  const { data: invoice, error } = await invoicePromise;

  if (error || !invoice) {
    notFound();
  }

  const { data: branding } = await getBranding(invoice.org_id);
  const logoUrl = branding?.logo_url;

  // const statusIcons = {
  //   draft: <Clock className="h-4 w-4" />,
  //   sent: <FileText className="h-4 w-4" />,
  //   paid: <CheckCircle2 className="h-4 w-4" />,
  // };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black mb-2 uppercase tracking-tight">
            Invoice
          </h1>
          <p className="font-mono text-muted-foreground">ID: {invoice.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <DownloadPDFButton invoiceId={invoice.id} />
          <div className="flex flex-col items-end gap-2">
            <InvoiceStatusUpdater
              invoiceId={invoice.id}
              currentStatus={invoice.status}
            />
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(invoice.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <div
        id="invoice-content"
        className="space-y-6 bg-background p-8 rounded-xl border border-transparent"
      >
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Organization Logo"
            width={200}
            height={100}
            className="h-16 w-auto object-contain mb-4"
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> Billed To
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-xl font-bold">{invoice.customer.name}</h3>
              <p className="text-muted-foreground">{invoice.customer.email}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-muted/50 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-black">
                    Total Due
                  </p>
                  <div className="text-3xl font-black text-primary">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(invoice.total)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-muted/50">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Line Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y">
                <tr>
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-xs">
                    Description
                  </th>
                  <th className="px-6 py-3 text-center font-bold uppercase tracking-wider text-xs">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-xs">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-xs">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item: any) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Product ID: {item.product_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{item.quantity}</td>
                    <td className="px-6 py-4 text-right">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 font-bold border-t-2 border-primary/20">
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-right uppercase tracking-wider"
                  >
                    Total Amount
                  </td>
                  <td className="px-6 py-4 text-right text-xl text-primary font-black">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(invoice.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
