"use client";

import { PlusCircle } from "lucide-react";
import { use, useOptimistic, useState } from "react";
import { ProductForm } from "@/components/forms/product-form";
import { ProductsTable } from "@/components/tables/products-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PaginatedValue, Product, Result } from "@/dal/types";

interface ProductsManagementProps {
  dataPromise: Promise<Result<PaginatedValue<Product>>>;
}

type OptimisticAction =
  | { type: "add"; payload: Product }
  | { type: "delete"; payload: string };

export function ProductsManagement({ dataPromise }: ProductsManagementProps) {
  const { data, error } = use(dataPromise);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

      return state;
    },
  );

  if (error !== null) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        {/* <div> */}
        {/* <h1 className="text-3xl font-bold">Products</h1> */}
        <p className="text-muted-foreground">Manage your goods and services.</p>
        {/* </div> */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Define a new product or service for your invoices.
              </DialogDescription>
            </DialogHeader>
            <ProductForm
              isModal
              orgId={data.data[0].org_id}
              onOptimistic={(newProduct) => {
                setOptimistic({ type: "add", payload: newProduct });
                setIsAddDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
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
