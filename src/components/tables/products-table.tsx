"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { use, useOptimistic } from "react";
import { DataTable } from "@/components/tables/data-table";
import type { PaginatedValue, Product, Result } from "@/dal/types";
import DeleteProductButton from "../buttons/delete-product-button";

export function ProductsTable({
  dataPromise,
}: {
  dataPromise: Promise<Result<PaginatedValue<Product>>>;
}) {
  // 1. Unwrap the promise
  const { data, error } = use(dataPromise);

  // 2. Setup Optimistic UI for the paginated object
  const [optimisticData, setOptimisticDelete] = useOptimistic(
    data,
    (state, idToDelete: string) => {
      if (!state) return state;
      return {
        ...state,
        data: state.data.filter((product) => product.id !== idToDelete),
        totalCount: state.totalCount - 1,
      };
    },
  );

  if (error) {
    return (
      <div className="text-destructive p-4 border rounded-md">
        Error fetching products: {error}
      </div>
    );
  }

  // 3. Extract the array from the optimistic state
  const products = optimisticData?.data ?? [];

  if (products.length < 1) {
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

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DeleteProductButton
          productId={row.original.id}
          setOptimisticProducts={setOptimisticDelete}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable 
        columns={columns} 
        data={products} 
        totalPages={optimisticData?.totalPages} 
      />
      
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>Total Products: {optimisticData?.totalCount}</span>
        <span>
          Page {optimisticData?.currentPage} of {optimisticData?.totalPages}
        </span>
      </div>
    </div>
  );
}