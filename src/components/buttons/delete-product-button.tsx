"use client";
import { Loader2, Trash2 } from "lucide-react";
import { useDeleteProduct } from "@/mutations/products";
import { Button } from "../ui/button";

export default function DeleteProductButton({
  productId,
}: {
  productId: string;
}) {
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (confirm("Are you sure you want to delete this product?")) {
          deleteProduct(productId);
        }
      }}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
