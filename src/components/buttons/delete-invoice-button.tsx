"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useDeleteInvoice } from "@/mutations/invoices";
import { Button } from "../ui/button";

export default function DeleteInvoiceButton({ rowId }: { rowId: string }) {
  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (confirm("Are you sure you want to delete this invoice?")) {
          deleteInvoice(rowId);
        }
      }}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
