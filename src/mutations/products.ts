import { useMutation } from "@tanstack/react-query";
import { createProductAction } from "@/actions/products";

//MARK: Cancel subscription
export const useCreateProduct = () => {
  return useMutation({
    mutationFn: (data: any) => createProductAction(data),
    onSuccess: () => {
      //   revalidatePathAction("/billing/manage/subscriptions");
    },
  });
};
