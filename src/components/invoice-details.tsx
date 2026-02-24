"use client";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Package,
  User,
} from "lucide-react";
import Image from "next/image";
import { use } from "react";
import type { Branding, FullInvoice, Result } from "@/dal/types";
import { DownloadPDFButton } from "./buttons/download-pdf-button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function InvoiceDetails({
  invoicePromise,
  brandingPromise,
}: {
  invoicePromise: Promise<Result<FullInvoice>>;
  brandingPromise: Promise<Result<Branding>>;
}) {
  const { data: invoice, error } = use(invoicePromise);
  const { data: branding, error: brandingError } = use(brandingPromise);

  // FIX: Show error if there IS an error or NO data
  if (error !== null || !invoice) {
    return (
      <div className="text-destructive p-8 border border-dashed rounded-lg text-center">
        {error || "Invoice not found"}
      </div>
    );
  }

  const statusIcons = {
    draft: <Clock className="h-4 w-4" />,
    sent: <FileText className="h-4 w-4" />,
    paid: <CheckCircle2 className="h-4 w-4" />,
  };

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
          {/* FIX: Use invoice.id consistently */}
          <DownloadPDFButton invoiceId={invoice.id} />
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={invoice.status === "paid" ? "default" : "secondary"}
              className="px-4 py-1 text-sm capitalize flex items-center gap-2"
            >
              {statusIcons[invoice.status as keyof typeof statusIcons]}
              {invoice.status}
            </Badge>
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
        {brandingError && (
          <div className="text-destructive">
            Error loading branding {brandingError}
          </div>
        )}
        {branding?.logo_url && (
          <Image
            src={branding.logo_url}
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
                {invoice.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold">{item.product?.name}</div>
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
