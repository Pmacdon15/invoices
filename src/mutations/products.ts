import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProductAction, deleteProductAction } from "@/actions/products";
import { updateTagAction } from "@/actions/revalidate";
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
    onSuccess: (result) => {
      toast.success("Product has been created");
      updateTagAction(`products-${result.org_id}`);
      router.push("/products");
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

      return result;
    },
    onSuccess: (result) => {
      toast.success("Product has been deleted");
      updateTagAction(`products-${result.org_id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
