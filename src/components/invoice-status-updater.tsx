"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateInvoiceStatus } from "@/mutations/invoices";

export function InvoiceStatusUpdater({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: "draft" | "sent" | "paid";
}) {
  const { mutate, isPending } = useUpdateInvoiceStatus();

  const handleStatusChange = (newStatus: "draft" | "sent" | "paid") => {
    mutate({ id: invoiceId, status: newStatus });
  };

  return (
    <Select
      defaultValue={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[130px] h-8 text-xs font-medium capitalize">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="sent">Sent</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
      </SelectContent>
    </Select>
  );
}
