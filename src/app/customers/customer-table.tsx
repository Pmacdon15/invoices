"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { use } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/dal/types";

export const columns: ColumnDef<Customer>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    ),
  },
];

interface CustomersTableProps {
  resultsPromise: Promise<[Customer[] | null, string | null]>;
}

export function CustomersTable({ resultsPromise }: CustomersTableProps) {
  const results = use(resultsPromise);

  const [customers, error] = results;

  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  if ((customers && customers.length < 1) || !customers) {
    return <div>Please add customers...</div>;
  }

  return (
    <div className="py-4">
      <DataTable columns={columns} data={customers} />
    </div>
  );
}
