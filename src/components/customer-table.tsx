"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { use } from "react";
import { DataTable } from "@/components/data-table";
import type { Customer, Result } from "@/dal/types";
import DeleteCustomerButton from "./buttons/delete-customer-button";

export function CustomersTable({
  resultsPromise,
}: {
  resultsPromise: Promise<Result<Customer[]>>;
}) {
  const { data, error } = use(resultsPromise);
  // const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();

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
      cell: ({ row }) => <DeleteCustomerButton rowId={row.original.id} />,
    },
  ];

  return (
    <div className="py-4">
      <DataTable columns={columns} data={customers} />
    </div>
  );
}
