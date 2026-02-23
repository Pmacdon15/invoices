"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Trash2 } from "lucide-react";
import { use } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { Product, Result } from "@/dal/types";
import { useDeleteProduct } from "@/mutations/products";

export function ProductsTable({
  dataPromise,
}: {
  dataPromise: Promise<Result<Product[]>>;
}) {
  const { data, error } = use(dataPromise);
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  if (error !== null) {
    return (
      <div className="text-destructive">Error fetching products: {error}</div>
    );
  }

  const products = data ?? [];

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product Name",
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const amount = row.original.price;
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (confirm("Are you sure you want to delete this product?")) {
              deleteProduct(row.original.id);
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
      ),
    },
  ];

  return <DataTable columns={columns} data={products} />;
}
