"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useDeleteCustomer } from "@/mutations/customers";
import { Button } from "../ui/button";

export default function DeleteCustomerButton({ rowId }: { rowId: string }) {
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (
          confirm(
            "Are you sure you want to delete this customer? This may affect existing invoices.",
          )
        ) {
          deleteCustomer(rowId);
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
