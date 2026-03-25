"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useDeleteInvoice } from "@/mutations/invoices";
import { Button } from "../ui/button";

export default function DeleteInvoiceButton({
  rowId,
  setOptimisticInvoices,
}: {
  rowId: string;
  setOptimisticInvoices: (action: string) => void;
}) {
  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();
  const [isPending, startTransition] = useTransition();

  const handleAction = () => {
    startTransition(async () => {
      setOptimisticInvoices(rowId);
      deleteInvoice(rowId);
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (confirm("Are you sure you want to delete this invoice?")) {
          handleAction();
        }
      }}
      disabled={isDeleting || isPending}
    >
      {isDeleting || isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
