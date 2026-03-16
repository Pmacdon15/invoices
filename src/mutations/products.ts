import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { createProductAction, deleteProductAction } from "@/actions/products";
import type { CreateProductInput } from "@/dal/types";

export const useCreateProduct = () => {
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const { data: result, error } = await createProductAction(data);

      if (error !== null) {
        throw new Error(error || "Failed to create Product");
      }

      return result;
    },
    onSuccess: () => {},
    onError: (error) => {
      if (error.message === "NEXT_REDIRECT") {
        toast.success("Product has been created");
        return;
      }
      toast.error(error.message);
    },
  });
};

export const useDeleteProduct = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await deleteProductAction(id);

      if (error !== null) {
        // If error is an object, ensure you grab the message string
        throw new Error(error || "Failed to delete product");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Product has been deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
