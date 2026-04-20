"use client";

import { useState } from "react";
import type {
  Customer,
  FullInvoice,
  PaginatedValue,
  Product,
  Result,
} from "@/dal/types";
import { InvoiceForm } from "./forms/invoice-form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface EditInvoiceDialogProps {
  invoice: FullInvoice;
  customersPromise: Promise<Result<PaginatedValue<Customer>>>;
  productsPromise: Promise<Result<PaginatedValue<Product>>>;
}

export function EditInvoiceDialog({
  invoice,
  customersPromise,
  productsPromise,
}: EditInvoiceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>
            Update the invoice details below.
          </DialogDescription>
        </DialogHeader>
        <InvoiceForm
          isModal          
          initialData={invoice}
          customersPromise={customersPromise}
          productsPromise={productsPromise}
          onOptimistic={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
