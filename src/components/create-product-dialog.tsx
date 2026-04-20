"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { ProductForm } from "@/components/forms/product-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Product } from "@/dal/types";

interface CreateProductDialogProps {
  orgId: string;
  onOptimistic?: (newProduct: Product) => void;
}

export function CreateProductDialog({
  orgId,
  onOptimistic,
}: CreateProductDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Define a new product or service for your invoices.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          isModal
          orgId={orgId}
          onOptimistic={(newProduct) => {
            onOptimistic?.(newProduct);
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
