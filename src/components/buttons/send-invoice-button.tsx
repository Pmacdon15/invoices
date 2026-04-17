"use client";

import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendInvoice } from "@/mutations/invoices";

interface SendInvoiceButtonProps {
  invoiceId: string;
  currentStatus: "draft" | "sent" | "paid";
}

export function SendInvoiceButton({
  invoiceId,
  currentStatus,
}: SendInvoiceButtonProps) {
  const { mutate, isPending } = useSendInvoice();

  const alreadySentOrPaid =
    currentStatus === "sent" || currentStatus === "paid";

  return (
    <Button
      onClick={() => mutate(invoiceId)}
      disabled={isPending || alreadySentOrPaid}
      variant={alreadySentOrPaid ? "outline" : "default"}
      className="gap-2"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      {isPending
        ? "Sending..."
        : alreadySentOrPaid
          ? currentStatus === "paid"
            ? "Paid"
            : "Sent"
          : "Send Invoice"}
    </Button>
  );
}
