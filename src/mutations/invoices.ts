import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { revalidatePathAction } from "@/actions/actions";
import { createInvoiceAction, deleteInvoiceAction } from "@/actions/invoices";
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

      //TODO: change this to update tag once auth is in
      revalidatePathAction("/invoices");
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

      return result; // This result is passed to onSuccess
    },
    onSuccess: () => {
      toast.success("Invoice has been deleted");
      //TODO: change this to update tag once auth is in
      revalidatePathAction("/invoices");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
