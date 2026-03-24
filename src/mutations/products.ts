import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProductAction, deleteProductAction } from "@/actions/products";
import type { CreateProductInput } from "@/dal/types";

export const useCreateProduct = () => {
  const router = useRouter();
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
      router.push("/products");
    },
    onError: (error: Error) => {     
      toast.error(error.message);
    },
  });
};

export const useDeleteProduct = () => {
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
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
