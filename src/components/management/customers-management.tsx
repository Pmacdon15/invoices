"use client";

import { PlusCircle } from "lucide-react";
import { use, useOptimistic, useState } from "react";
import { CustomerForm } from "@/components/forms/customer-form";
import { CustomersTable } from "@/components/tables/customer-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Customer, PaginatedValue, Result } from "@/dal/types";

interface CustomersManagementProps {
  resultsPromise: Promise<Result<PaginatedValue<Customer>>>;
}

type OptimisticAction =
  | { type: "add"; payload: Customer }
  | { type: "delete"; payload: string };

export function CustomersManagement({
  resultsPromise,
}: CustomersManagementProps) {
  const { data, error } = use(resultsPromise);
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
          data: state.data.filter((c) => c.id !== action.payload),
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
        <p className="text-muted-foreground">
          Manage your customer database.
        </p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Enter the customer's details to add them to your database.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm
              orgId={data.data[0]?.org_id ?? ""}
              isModal
              onOptimistic={(newCustomer) => {
                setOptimistic({ type: "add", payload: newCustomer });
                setIsAddDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <CustomersTable
        data={optimisticState?.data ?? []}
        totalPages={data?.totalPages ?? 1}
        currentPage={data?.currentPage ?? 1}
        totalCount={optimisticState?.totalCount ?? 0}
        setOptimistic={setOptimistic}
      />
    </div>
  );
}
