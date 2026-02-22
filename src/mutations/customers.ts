import { useMutation } from "@tanstack/react-query";
import { createCustomerAction } from "@/actions/customers";

//MARK: Cancel subscription
export const useCreateCustomer = () => {
  return useMutation({
    mutationFn: (data: any) => createCustomerAction(data),
    onSuccess: () => {
      //   revalidatePathAction("/billing/manage/subscriptions");
    },
  });
};
