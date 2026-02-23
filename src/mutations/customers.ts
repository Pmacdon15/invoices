import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCustomerAction,
  deleteCustomerAction,
} from "@/actions/customers";
import type { CreateCustomerInput } from "@/dal/types";

export const useCreateCustomer = () => {
  return useMutation({
    mutationFn: (data: CreateCustomerInput) => createCustomerAction(data),
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomerAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
