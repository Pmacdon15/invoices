import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/actions/products";
import type { CreateProductInput, UpdateProductInput } from "@/dal/types";

export const useCreateProduct = () => {
  return useMutation({
    mutationFn: async (variables: CreateProductInput) => {
      const response = await createProductAction(variables);
      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Product created!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteProduct = (options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteProductAction(id);
      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Product has been deleted");
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

export const useUpdateProduct = () => {
  return useMutation({
    mutationFn: async (data: UpdateProductInput) => {
      const response = await updateProductAction(data);
      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Product has been updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
