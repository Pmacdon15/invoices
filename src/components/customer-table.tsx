"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { use } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { Customer, Result } from "@/dal/types";

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
  resultsPromise: Promise<Result<Customer[]>>;
}

export function CustomersTable({ resultsPromise }: CustomersTableProps) {
   const {data, error}= use(resultsPromise);

  if (error!== null) {
    return <div className="text-destructive">Error: {error}</div>;
  }
  if (data.length < 1) {
    return <div>Please add customers...</div>;
  }

  return (
    <div className="py-4">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
