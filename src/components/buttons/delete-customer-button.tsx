"use client";

import { Loader2, Trash2 } from "lucide-react";
import { startTransition } from "react";
import { useDeleteCustomer } from "@/mutations/customers";
import { Button } from "../ui/button";

export default function DeleteCustomerButton({
  rowId,
  setOptimisticCustomers,
}: {
  rowId: string;
  setOptimisticCustomers: (action: string) => void;
}) {
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();
  const handleAction = () => {
    startTransition(async () => {
      setOptimisticCustomers(rowId);
      deleteCustomer(rowId);
    });
  };
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
          handleAction();
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
