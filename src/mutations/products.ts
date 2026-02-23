import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProductAction, deleteProductAction } from "@/actions/products";
import type { CreateProductInput } from "@/dal/types";

export const useCreateProduct = () => {
  return useMutation({
    mutationFn: (data: CreateProductInput) => createProductAction(data),
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProductAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
