import { useMutation } from "@tanstack/react-query";
import { createInvoiceAction } from "@/actions/invoices";

//MARK: Cancel subscription
export const useCreateInvoice = () => {
  return useMutation({
    mutationFn: (data: any) => createInvoiceAction(data),
    onSuccess: () => {
      //   revalidatePathAction("/billing/manage/subscriptions");
    },
  });
};
