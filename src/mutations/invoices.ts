import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  updateInvoiceStatusAction,
} from "@/actions/invoices";
import { updateTagAction } from "@/actions/revalidate";
import type { CreateInvoiceInput } from "@/dal/types";

export const useCreateInvoice = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data: result, error } = await createInvoiceAction(input);

      if (error !== null) {
        throw new Error(error || "Failed to create invoice");
      }

      return result;
    },
    onSuccess: (data) => {
      toast.success("Invoice has been created");

      updateTagAction(`invoices-${data.org_id}`);
      if (data?.id) {
        router.push(`/invoices/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteInvoice = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await deleteInvoiceAction(id);

      if (error !== null) {
        // If error is an object, ensure you grab the message string
        throw new Error(error || "Failed to delete invoice");
      }

      return result;
    },
    onSuccess: (result) => {
      toast.success("Invoice has been deleted");
      updateTagAction(`invoices-${result.org_id}`);
      updateTagAction(`invoice-${result.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateInvoiceStatus = () => {
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "draft" | "sent" | "paid";
    }) => {
      const { data: result, error } = await updateInvoiceStatusAction(
        id,
        status,
      );

      if (error !== null) {
        throw new Error(error || "Failed to update invoice status");
      }

      return result;
    },
    onSuccess: (result) => {
      toast.success("Invoice status has been updated");
      updateTagAction(`invoices-${result.org_id}`);
      updateTagAction(`invoice-${result.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
