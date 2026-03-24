"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createCustomerAction,
  deleteCustomerAction,
} from "@/actions/customers";
import type { CreateCustomerInput } from "@/dal/types";

export const useCreateCustomer = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const response = await createCustomerAction(data);
      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Customer has been created");
      router.push("/customers");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteCustomer = () => {
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
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
