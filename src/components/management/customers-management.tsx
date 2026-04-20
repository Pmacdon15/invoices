"use client";

import { use, useOptimistic } from "react";
import { CreateCustomerDialog } from "@/components/create-customer-dialog";
import { CustomersTable } from "@/components/tables/customer-table";
import type { Customer, PaginatedValue, Result } from "@/dal/types";

interface CustomersManagementProps {
  resultsPromise: Promise<Result<PaginatedValue<Customer>>>;
}

type OptimisticAction =
  | { type: "add"; payload: Customer }
  | { type: "delete"; payload: string }
  | { type: "update"; payload: Customer };

export function CustomersManagement({
  resultsPromise,
}: CustomersManagementProps) {
  const { data, error } = use(resultsPromise);

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

      if (action.type === "update") {
        return {
          ...state,
          data: state.data.map((c) =>
            c.id === action.payload.id ? action.payload : c
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
        <p className="text-muted-foreground">
          Manage your customer database.
        </p>
        <CreateCustomerDialog
          orgId={data.data[0]?.org_id ?? ""}
          onOptimistic={(newCustomer) => {
            setOptimistic({ type: "add", payload: newCustomer });
          }}
        />
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
