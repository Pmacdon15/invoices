"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { use, useOptimistic } from "react";
import { DataTable } from "@/components/tables/data-table";
import type { Customer, Result } from "@/dal/types";
import DeleteCustomerButton from "../buttons/delete-customer-button";

export function CustomersTable({
  resultsPromise,
}: {
  resultsPromise: Promise<Result<Customer[]>>;
}) {
  const { data, error } = use(resultsPromise);
  const [optimisticCustomers, setOptimisticCustomers] = useOptimistic(
    data ?? [],
    (state, idToDelete: string) =>
      state.filter((customer) => customer.id !== idToDelete),
  );

  if (error !== null) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  const customers = optimisticCustomers ?? [];

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
      cell: ({ row }) => <DeleteCustomerButton rowId={row.original.id} setOptimisticCustomers={setOptimisticCustomers}/>,
    },
  ];

  return (
    <div className="py-4">
      <DataTable columns={columns} data={customers} />
    </div>
  );
}
