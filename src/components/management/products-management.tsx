"use client";

import { use, useOptimistic } from "react";
import { CreateProductDialog } from "@/components/create-product-dialog";
import { ProductsTable } from "@/components/tables/products-table";
import type { PaginatedValue, Product, Result } from "@/dal/types";

interface ProductsManagementProps {
  dataPromise: Promise<Result<PaginatedValue<Product>>>;
}

type OptimisticAction =
  | { type: "add"; payload: Product }
  | { type: "delete"; payload: string }
  | { type: "update"; payload: Product };

export function ProductsManagement({ dataPromise }: ProductsManagementProps) {
  const { data, error } = use(dataPromise);

  const [optimisticState, setOptimistic] = useOptimistic(
    data,
    (state, action: OptimisticAction) => {
      if (!state) return state;

      if (action.type === "add") {
        return {
          ...state,
          data: [action.payload, ...state.data],
          totalCount: state.totalCount + 1,
        };
      }

      if (action.type === "delete") {
        return {
          ...state,
          data: state.data.filter((p) => p.id !== action.payload),
          totalCount: state.totalCount - 1,
        };
      }

      if (action.type === "update") {
        return {
          ...state,
          data: state.data.map((p) =>
            p.id === action.payload.id ? action.payload : p,
          ),
        };
      }

      return state;
    },
  );

  if (error !== null) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage your goods and services.</p>

        <CreateProductDialog
          orgId={data.data[0]?.org_id}
          onOptimistic={(newProduct) => {
            setOptimistic({ type: "add", payload: newProduct });
          }}
        />
      </div>

      <ProductsTable
        data={optimisticState?.data ?? []}
        totalPages={data?.totalPages ?? 1}
        currentPage={data?.currentPage ?? 1}
        totalCount={optimisticState?.totalCount ?? 0}
        setOptimistic={setOptimistic}
      />
    </div>
  );
}
