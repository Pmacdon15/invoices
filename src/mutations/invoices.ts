import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  updateInvoiceStatusAction,
} from "@/actions/invoices";
// import { updateTagAction } from "@/actions/revalidate";
import type { CreateInvoiceInput } from "@/dal/types";

export const useCreateInvoice = () => {
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data: result, error } = await createInvoiceAction(input);

      if (error !== null) {
        throw new Error(error || "Failed to create invoice");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Invoice has been created");

      // if (data?.id) {
      //   router.push(`/invoices/${data.id}`);
      // }
    },
    onError: (error) => {
      // console.log("Error: ", error)
      if (error.message === "NEXT_REDIRECT") {
        toast.success("Invoice has been created");
        return;
      }

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
    onSuccess: () => {
      toast.success("Invoice has been deleted");
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
    onSuccess: () => {
      toast.success("Invoice status has been updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
