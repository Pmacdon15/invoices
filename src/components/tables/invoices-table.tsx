"use client";

import { useMemo } from "react";

import type { Invoice } from "@/dal/types";
import { DataTable } from "./data-table";
import { getInvoicesColumns } from "./invoice-columns";

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
  const columns = useMemo(
    () => getInvoicesColumns({ setOptimistic }),
    [setOptimistic],
  );

  if (!data || data.length < 1) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        No invoices found for this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        totalPages={totalPages}
        currentPage={currentPage}
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
