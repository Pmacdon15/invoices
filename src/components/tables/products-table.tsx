"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { use, useOptimistic } from "react";
import { DataTable } from "@/components/tables/data-table";
import type { Product, Result } from "@/dal/types";
import DeleteProductButton from "../buttons/delete-product-button";

export function ProductsTable({
  dataPromise,
}: {
  dataPromise: Promise<Result<Product[]>>;
}) {
  const { data, error } = use(dataPromise);
  const [optimisticProducts, setOptimisticProducts] = useOptimistic(
    data ?? [],
    (state, idToDelete: string) =>
      state.filter((product) => product.id !== idToDelete),
  );

  if (error !== null) {
    return (
      <div className="text-destructive">Error fetching products: {error}</div>
    );
  }

  const products = optimisticProducts?? [];

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
      cell: ({ row }) => <DeleteProductButton productId={row.original.id}  setOptimisticProducts={ setOptimisticProducts}/>,
    },
  ];

  return <DataTable columns={columns} data={products} />;
}
