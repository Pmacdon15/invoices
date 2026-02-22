"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Invoice, Customer } from "@/dal/types";

interface InvoicesTableProps {
  data: Invoice[];
  customers: Customer[];
}

export function InvoicesTable({ data, customers }: InvoicesTableProps) {
  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "id",
      header: "Invoice #",
      cell: ({ row }) => (
        <span className="font-mono uppercase">{row.original.id}</span>
      ),
    },
    {
      accessorKey: "customer_id",
      header: "Customer",
      cell: ({ row }) => {
        const customer = customers.find(
          (c) => c.id === row.original.customer_id,
        );
        return customer ? customer.name : "Unknown";
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
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "paid" ? "default" : "secondary"}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
