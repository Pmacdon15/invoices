"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { CustomerForm } from "@/components/forms/customer-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Customer } from "@/dal/types";

interface CreateCustomerDialogProps {
  orgId: string;
  // This is already marked as optional with '?', 
  // but we must handle the logic inside the component.
  onOptimistic?: (newCustomer: Customer) => void;
}

export function CreateCustomerDialog({
  orgId,
  onOptimistic,
}: CreateCustomerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter the customer's details to add them to your database.
          </DialogDescription>
        </DialogHeader>
        <CustomerForm
          orgId={orgId}
          isModal
          onOptimistic={(newCustomer) => {
            // Use optional chaining to call the function only if it exists
            onOptimistic?.(newCustomer);
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}