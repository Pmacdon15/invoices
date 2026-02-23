"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTagAction } from "@/actions/actions";
import {
  createCustomerAction,
  deleteCustomerAction,
} from "@/actions/customers";
import type { CreateCustomerInput } from "@/dal/types";

export const useCreateCustomer = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const { data: result, error } = await createCustomerAction(data);

      if (error !== null) {
        throw new Error(error || "Failed to create customer");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Customer has been created");

      updateTagAction("customers");
      router.push(`/customers`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteCustomer = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await deleteCustomerAction(id);

      if (error !== null) {
        // If error is an object, ensure you grab the message string
        throw new Error(error || "Failed to delete customer");
      }

      return result; // This result is passed to onSuccess
    },
    onSuccess: () => {
      toast.success("Customer has been deleted");
      updateTagAction("customers");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
