import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateInvoicePrefixAction } from "@/actions/org-settings";

export const useUpdateInvoicePrefix = () => {
  return useMutation({
    mutationFn: async (prefix: string) => {
      const response = await updateInvoicePrefixAction(prefix);

      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Invoice prefix has been updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
