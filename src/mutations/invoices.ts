import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInvoiceAction, deleteInvoiceAction } from "@/actions/invoices";
import type { CreateInvoiceInput } from "@/dal/types";

export const useCreateInvoice = () => {
  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => createInvoiceAction(data),
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvoiceAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};
