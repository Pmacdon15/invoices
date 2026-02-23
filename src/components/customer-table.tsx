"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Trash2 } from "lucide-react";
import { use } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { Customer, Result } from "@/dal/types";
import { useDeleteCustomer } from "@/mutations/customers";

export function CustomersTable({
  resultsPromise,
}: {
  resultsPromise: Promise<Result<Customer[]>>;
}) {
  const { data, error } = use(resultsPromise);
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();

  if (error !== null) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  const customers = data ?? [];

  if (customers.length < 1) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        Please add customers...
      </div>
    );
  }

  const columns: ColumnDef<Customer>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (
              confirm(
                "Are you sure you want to delete this customer? This may affect existing invoices.",
              )
            ) {
              deleteCustomer(row.original.id);
            }
          }}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      ),
    },
  ];

  return (
    <div className="py-4">
      <DataTable columns={columns} data={customers} />
    </div>
  );
}
