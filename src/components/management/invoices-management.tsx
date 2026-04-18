"use client";

import { PlusCircle } from "lucide-react";
import { use, useOptimistic, useState } from "react";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { InvoicesTable } from "@/components/tables/invoices-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Customer,
  Invoice,
  PaginatedValue,
  Product,
  Result,
} from "@/dal/types";

interface InvoicesManagementProps {
  invoicesPromise: Promise<Result<PaginatedValue<Invoice>>>;
  customersPromise: Promise<Result<PaginatedValue<Customer>>>;
  productsPromise: Promise<Result<PaginatedValue<Product>>>;
}

type OptimisticAction =
  | { type: "add"; payload: Invoice }
  | { type: "delete"; payload: string };

export function InvoicesManagement({
  invoicesPromise,
  customersPromise,
  productsPromise,
}: InvoicesManagementProps) {
  const { data, error } = use(invoicesPromise);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
          data: state.data.filter((i) => i.id !== action.payload),
          totalCount: state.totalCount - 1,
        };
      }

      return state;
    },
  );

  if (error !== null) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  const filteredInvoices = optimisticState?.data.filter((invoice) => {
    if (statusFilter === "all") return true;
    return invoice.status === statusFilter;
  }) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">
            Managing your billing and payments.
          </p>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Generate a new invoice by selecting a customer and adding
                products.
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm
              isModal
              orgId={data?.data[0]?.org_id ?? ""}
              customersPromise={customersPromise}
              productsPromise={productsPromise}
              onOptimistic={(newInvoice) => {
                setOptimistic({ type: "add", payload: newInvoice });
                setIsCreateDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <InvoicesTable
        data={filteredInvoices}
        totalPages={data?.totalPages ?? 1}
        currentPage={data?.currentPage ?? 1}
        totalCount={optimisticState?.totalCount ?? 0}
        setOptimistic={setOptimistic}
      />
    </div>
  );
}
