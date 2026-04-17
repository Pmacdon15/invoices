"use client";
import { Loader2, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useDeleteInvoice } from "@/mutations/invoices";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={isDeleting || isPending}
        >
          {isDeleting || isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the invoice.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
