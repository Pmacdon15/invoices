"use client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/actions/customers";
import type { CreateCustomerInput, UpdateCustomerInput } from "@/dal/types";

export const useCreateCustomer = () => {
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
    },
    onError: (error: Error) => {
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
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateCustomer = () => {
  return useMutation({
    mutationFn: async (data: UpdateCustomerInput) => {
      const response = await updateCustomerAction(data);
      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Customer has been updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
