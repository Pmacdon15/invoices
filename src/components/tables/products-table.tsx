"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/dal/types";
import { cn } from "@/lib/utils";
import DeleteProductButton from "../buttons/delete-product-button";

interface ProductsTableProps {
  data: Product[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  setOptimistic: (action: { type: "delete"; payload: string }) => void;
}

export function ProductsTable({
  data,
  totalPages,
  currentPage,
  totalCount,
  setOptimistic,
}: ProductsTableProps) {
  if (!data || data.length < 1) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        No products found.
      </div>
    );
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => (
        <div
          className={cn(
            row.original.status === "disabled" && "opacity-50 grayscale",
          )}
        >
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const amount = Number(row.original.price);
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);

        return (
          <div
            className={cn(
              "font-medium",
              row.original.status === "disabled" && "opacity-50 grayscale",
            )}
          >
            {formatted}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DeleteProductButton
          productId={row.original.id}
          setOptimisticProducts={(id) =>
            setOptimistic({ type: "delete", payload: id })
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={data} totalPages={totalPages} />

      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>Total Products: {totalCount}</span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
}
