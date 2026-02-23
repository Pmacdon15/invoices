"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { use } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { Product, Result } from "@/dal/types";

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Product Name",
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
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

interface ProductsTableProps {
  dataPromise: Promise<Result<Product[]>>;
}

export function ProductsTable({ dataPromise }: ProductsTableProps) {
  
  const { data, error } = use(dataPromise);

  if (error !== null) {
    return (
      <div className="text-destructive">Error fetching products: {error}</div>
    );
  }
  
  return <DataTable columns={columns} data={data} />;
}
