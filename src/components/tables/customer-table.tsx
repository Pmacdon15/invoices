"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { use, useOptimistic } from "react";
import { DataTable } from "@/components/tables/data-table";
import type { Customer, PaginatedValue, Result } from "@/dal/types";
import DeleteCustomerButton from "../buttons/delete-customer-button";

export function CustomersTable({
  resultsPromise,
}: {
  resultsPromise: Promise<Result<PaginatedValue<Customer>>>;
}) {
  const { data, error } = use(resultsPromise);

  const [optimisticData, setOptimisticDelete] = useOptimistic(
    data,
    (state, idToDelete: string) => {
      if (!state) return state;
      return {
        ...state,
        customers: state.data.filter((c) => c.id !== idToDelete),
        totalCount: state.totalCount - 1,
      };
    },
  );

  if (error !== null) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  // 2. Safely extract the customers array for the table
  const customers = optimisticData?.data ?? [];

  if (customers.length < 1) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        No customers found on this page.
      </div>
    );
  }

  const columns: ColumnDef<Customer>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      id: "actions",
      cell: ({ row }) => (
        <DeleteCustomerButton
          rowId={row.original.id}
          setOptimisticCustomers={setOptimisticDelete}
        />
      ),
    },
  ];

  return (
    <div className="py-4 space-y-4">
      <DataTable
        columns={columns}
        data={customers}
        totalPages={data.totalPages}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Total: {optimisticData?.totalCount}</span>
        <span>
          Page {optimisticData?.currentPage} of {optimisticData?.totalPages}
        </span>
      </div>
    </div>
  );
}
