"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import Link from "next/link";
import { use, useOptimistic, ViewTransition } from "react";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Invoice, PaginatedValue, Result } from "@/dal/types";
import DeleteInvoiceButton from "../buttons/delete-invoice-button";

interface InvoicesTableProps {
  invoicesPromise: Promise<Result<PaginatedValue<Invoice>>>;
}

export function InvoicesTable({ invoicesPromise }: InvoicesTableProps) {
  const { data, error } = use(invoicesPromise);

  // 1. Setup Optimistic UI for the PaginatedValue object
  const [optimisticData, setOptimisticDelete] = useOptimistic(
    data,
    (state, idToDelete: string) => {
      if (!state) return state;
      return {
        ...state,
        data: state.data.filter((inv) => inv.id !== idToDelete),
        totalCount: state.totalCount - 1,
      };
    },
  );

  if (error) {
    return (
      <div className="p-4 text-destructive bg-destructive/10 rounded border border-destructive/20">
        Error: {error}
      </div>
    );
  }

  // 2. Extract the array from the optimistic state
  const invoices = optimisticData?.data ?? [];

  if (invoices.length < 1) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        No invoices found for this period.
      </div>
    );
  }

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
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {customer ? customer.name : "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">
              {customer?.email}
            </span>
          </div>
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
        const amount = Number(row.original.total);
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
        <ViewTransition>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/invoices/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <DeleteInvoiceButton
              rowId={row.original.id}
              setOptimisticInvoices={setOptimisticDelete}
            />
          </div>
        </ViewTransition>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable 
        columns={columns} 
        data={invoices} 
        totalPages={optimisticData?.totalPages} 
      />
      
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>Total Invoices: {optimisticData?.totalCount}</span>
        <span>
          Page {optimisticData?.currentPage} of {optimisticData?.totalPages}
        </span>
      </div>
    </div>
  );
}