"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Invoice, Result } from "@/dal/types";
import { useDeleteInvoice } from "@/mutations/invoices";

interface InvoicesTableProps {
  invoicesPromise: Promise<Result<Invoice[]>>;
}

export function InvoicesTable({ invoicesPromise }: InvoicesTableProps) {
  const { data, error } = use(invoicesPromise);
  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();

  if (error) {
    return (
      <div className="p-4 text-destructive bg-destructive/10 rounded">
        Error: {error}
      </div>
    );
  }

  const invoices = data ?? [];

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "id",
      header: "Invoice #",
      cell: ({ row }) => (
        <Link
          href={`/invoices/${row.original.id}`}
          className="font-mono uppercase text-xs text-primary hover:underline"
        >
          #{row.original.id.slice(0, 8)}
        </Link>
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
        const amount = row.original.total;
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/invoices/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (confirm("Are you sure you want to delete this invoice?")) {
                deleteInvoice(row.original.id);
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
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={invoices} />;
}
