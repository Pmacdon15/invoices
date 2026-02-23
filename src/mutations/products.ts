import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { revalidatePathAction } from "@/actions/actions";
import { createProductAction, deleteProductAction } from "@/actions/products";
import type { CreateProductInput } from "@/dal/types";

export const useCreateProduct = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const { data: result, error } = await createProductAction(data);

      if (error !== null) {
        throw new Error(error || "Failed to create Product");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Product has been created");

      //TODO: change this to update tag once auth is in
      revalidatePathAction("/products");

      router.push(`/products`);
    },
    onError: (error) => {
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

      return result; // This result is passed to onSuccess
    },
    onSuccess: () => {
      toast.success("Product has been deleted");
      //TODO: change this to update tag once auth is in
      revalidatePathAction("/invoices");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
