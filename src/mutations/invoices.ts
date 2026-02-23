import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInvoiceAction, deleteInvoiceAction } from "@/actions/invoices";
import type { CreateInvoiceInput } from "@/dal/types";

export const useCreateInvoice = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data: result, error } = await createInvoiceAction(input);

      if (error !== null) {
        // If error is an object, ensure you grab the message string
        throw new Error(error || "Failed to create invoice");
      }

      return result; // This result is passed to onSuccess
    },
    onSuccess: (data) => {
      toast.success("Invoice has been created");

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
    mutationFn: (id: string) => deleteInvoiceAction(id),
    onSuccess: () => {},
  });
};
