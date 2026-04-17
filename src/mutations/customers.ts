"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createCustomerAction,
  deleteCustomerAction,
} from "@/actions/customers";
import type { CreateCustomerInput, Customer } from "@/dal/types";

export const useCreateCustomer = (options?: {
  onSuccess?: (data: Customer) => void;
  onError?: (error: Error) => void;
}) => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const response = await createCustomerAction(data);
      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Customer has been created");
      if (options?.onSuccess) {
        options.onSuccess(data);
      } else {
        router.push("/customers");
      }
    },
    onError: (error: Error) => {
      if (options?.onError) {
        options.onError(error);
      } else {
        toast.error(error.message);
      }
    },
  });
};

export const useDeleteCustomer = (options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteCustomerAction(id);
      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Customer has been deleted");
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      if (options?.onError) {
        options.onError(error);
      } else {
        toast.error(error.message);
      }
    },
  });
};
