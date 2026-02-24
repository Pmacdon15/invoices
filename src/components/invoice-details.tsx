"use client";

import { useOrganization } from "@clerk/nextjs";
import { Calendar, CreditCard, Package, User } from "lucide-react";
import Image from "next/image";
import { use } from "react";
import type { FullInvoice, Result } from "@/dal/types";
import { DownloadPDFButton } from "./buttons/download-pdf-button";
import { InvoiceStatusUpdater } from "./invoice-status-updater";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function InvoiceDetails({
  invoicePromise,
}: {
  invoicePromise: Promise<Result<FullInvoice>>;
}) {
  const { data: invoice, error } = use(invoicePromise);
  const { organization } = useOrganization();

  if (error !== null || !invoice) {
    return (
      <div className="text-destructive p-8 border border-dashed rounded-lg text-center">
        {error || "Invoice not found"}
      </div>
    );
  }

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-4xl font-black mb-2 uppercase tracking-tight">
            Invoice
          </h1>
          <p className="font-mono text-muted-foreground text-sm break-all">
            ID: {invoice.id}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <DownloadPDFButton invoiceId={invoice.id} />
          <div className="flex flex-col items-end gap-2">
            <InvoiceStatusUpdater
              invoiceId={invoice.id}
              currentStatus={invoice.status as "draft" | "sent" | "paid"}
            />
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(invoice.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <div
        id="invoice-content"
        className="space-y-6 bg-background p-4 md:p-8 rounded-xl border border-muted/20"
      >
        <div className="flex flex-col gap-4">
          {organization?.imageUrl && !!organization?.hasImage && (
            <Image
              src={organization?.imageUrl}
              alt="Organization Logo"
              width={200}
              height={100}
              className="h-12 md:h-16 w-auto object-contain"
            />
          )}
          <h1 className="text-xl md:text-2xl font-bold">{organization?.name}</h1>
        </div>

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
              <p className="text-xs text-muted-foreground uppercase font-black">
                Total Due
              </p>
              <div className="text-3xl font-black text-primary">
                {currencyFormatter.format(invoice.total)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-muted/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Line Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="md:hidden divide-y">
              {invoice.items.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="font-bold pr-2">{item.product?.name}</div>
                    <div className="font-black text-primary">
                      {currencyFormatter.format(item.quantity * item.unit_price)}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {item.quantity} x {currencyFormatter.format(item.unit_price)}
                    </span>
                    <span className="font-mono uppercase">
                      ID: {item.product_id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="bg-primary/5 p-4 flex justify-between items-center">
                <span className="text-xs font-bold uppercase">Total Amount</span>
                <span className="text-xl font-black text-primary">
                  {currencyFormatter.format(invoice.total)}
                </span>
              </div>
            </div>

            <table className="hidden md:table w-full text-sm">
              <thead className="bg-muted/40 border-y">
                <tr>
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-xs">Description</th>
                  <th className="px-6 py-3 text-center font-bold uppercase tracking-wider text-xs">Qty</th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-xs">Price</th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-xs">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold">{item.product?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Product ID: {item.product_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{item.quantity}</td>
                    <td className="px-6 py-4 text-right">
                      {currencyFormatter.format(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {currencyFormatter.format(item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 font-bold border-t-2 border-primary/20">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider">Total Amount</td>
                  <td className="px-6 py-4 text-right text-xl text-primary font-black">
                    {currencyFormatter.format(invoice.total)}
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