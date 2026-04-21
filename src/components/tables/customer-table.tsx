"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import DeleteCustomerButton from "../buttons/delete-customer-button";
import { CustomerForm } from "../forms/customer-form";
import { DataTable } from "./data-table";

const EditCustomerCell = ({
  customer,
  setOptimistic,
}: {
  customer: Customer;
  setOptimistic: (action: any) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update the customer details below.
          </DialogDescription>
        </DialogHeader>
        <CustomerForm
          orgId={customer.org_id}
          initialData={customer}
          isModal
          onOptimistic={(updatedCustomer) => {
            setOptimistic({ type: "update", payload: updatedCustomer });
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

interface CustomersTableProps {
  data: Customer[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  setOptimistic: (
    action:
      | { type: "delete"; payload: string }
      | { type: "update"; payload: Customer },
  ) => void;
}

export function CustomersTable({
  data,
  totalPages,
  currentPage,
  totalCount,
  setOptimistic,
}: CustomersTableProps) {
  if (!data || data.length < 1) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        No customers found on this page.
      </div>
    );
  }

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div
          className={cn(
            row.original.status === "disabled" && "opacity-50 grayscale",
          )}
        >
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div
          className={cn(
            row.original.status === "disabled" && "opacity-50 grayscale",
          )}
        >
          {row.original.email}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <EditCustomerCell
            customer={row.original}
            setOptimistic={setOptimistic}
          />
          <DeleteCustomerButton
            rowId={row.original.id}
            setOptimisticCustomers={(id) =>
              setOptimistic({ type: "delete", payload: id })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div className="py-4 space-y-4">
      <DataTable columns={columns} data={data} totalPages={totalPages} />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Total: {totalCount}</span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
}
