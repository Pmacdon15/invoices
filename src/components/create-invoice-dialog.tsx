"use client";

import { PlusCircle } from "lucide-react";
import { Suspense, useState } from "react";
import NewInvoiceFallback from "@/components/fallbacks/new-invoice-fallback";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  Customer,
  Invoice,
  PaginatedValue,
  Product,
  Result,
} from "@/dal/types";

interface CreateInvoiceDialogProps {
  customersPromise: Promise<Result<PaginatedValue<Customer>>>;
  productsPromise: Promise<Result<PaginatedValue<Product>>>;
  onOptimistic: (newInvoice: Invoice) => void;
}

export function CreateInvoiceDialog({
  customersPromise,
  productsPromise,
  onOptimistic,
}: CreateInvoiceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Generate a new invoice by selecting a customer and adding products.
          </DialogDescription>
        </DialogHeader>
        <Suspense fallback={<NewInvoiceFallback isModal />}>
          <InvoiceForm
            isModal
            customersPromise={customersPromise}
            productsPromise={productsPromise}
            onOptimistic={(newInvoice) => {
              onOptimistic(newInvoice);
              setIsOpen(false);
            }}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
