"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import type { Customer } from "@/dal/types";
import DeleteCustomerButton from "../buttons/delete-customer-button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CustomersTableProps {
  data: Customer[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  setOptimistic: (action: { type: "delete"; payload: string }) => void;
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
        <div className={cn(row.original.status === "disabled" && "opacity-50 grayscale")}>
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className={cn(row.original.status === "disabled" && "opacity-50 grayscale")}>
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
        <DeleteCustomerButton
          rowId={row.original.id}
          setOptimisticCustomers={(id) => setOptimistic({ type: "delete", payload: id })}
        />
      ),
    },
  ];

  return (
    <div className="py-4 space-y-4">
      <DataTable
        columns={columns}
        data={data}
        totalPages={totalPages}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Total: {totalCount}</span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
}
