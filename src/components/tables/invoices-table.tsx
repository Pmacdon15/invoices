"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/dal/types";
import DeleteInvoiceButton from "../buttons/delete-invoice-button";
import { cn } from "@/lib/utils";

interface InvoicesTableProps {
  data: Invoice[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  setOptimistic: (action: { type: "delete"; payload: string }) => void;
}

export function InvoicesTable({
  data,
  totalPages,
  currentPage,
  totalCount,
  setOptimistic,
}: InvoicesTableProps) {
  if (!data || data.length < 1) {
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
      cell: ({ row }) => {
        const id = row.original.id;
        // Check if it's an optimistic ID (e.g. from the form)
        const isOptimistic = id.startsWith("opt-");
        return (
          <div className="flex items-center gap-2">
            <Link
              href={isOptimistic ? "#" : `/invoices/${id}`}
              className={cn(
                "font-mono uppercase text-xs text-primary hover:underline",
                isOptimistic && "opacity-50 pointer-events-none"
              )}
            >
              #{id.slice(0, 8)}
            </Link>
            {isOptimistic && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">Saving...</Badge>
            )}
          </div>
        );
      },
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
      cell: ({ row }) => {
        const date = row.original.created_at;
        return date ? new Date(date).toLocaleDateString() : "Pending";
      },
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
            <Button asChild variant="ghost" size="icon" disabled={row.original.id.startsWith("opt-")}>
              <Link href={`/invoices/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <DeleteInvoiceButton
              rowId={row.original.id}
              setOptimisticInvoices={(id) => setOptimistic({ type: "delete", payload: id })}
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
        data={data} 
        totalPages={totalPages} 
      />
      
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>Total Invoices: {totalCount}</span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
}