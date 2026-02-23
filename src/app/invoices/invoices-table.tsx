"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { use } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/dal/types";

interface InvoicesTableProps {
  // This correctly matches your DAL return type
  invoicesPromise: Promise<[data: Invoice[] | null, error: string | null]>;
}

export function InvoicesTable({ invoicesPromise }: InvoicesTableProps) {
 
  const [data, error] = use(invoicesPromise);

 
  if (error) {
    return <div className="p-4 text-destructive bg-destructive/10 rounded">Error: {error}</div>;
  }

  // 3. Fallback to an empty array if data is null (prevents the 'not assignable' error)
  const invoices = data ?? [];

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "id",
      header: "Invoice #",
      cell: ({ row }) => (
        <span className="font-mono uppercase text-xs">{row.original.id}</span>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customer;
        return (
          <span className="font-medium">
            {customer ? customer.name : "Unknown"}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total") as string);
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "paid" ? "default" : "secondary"}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return <DataTable columns={columns} data={invoices} />;
}