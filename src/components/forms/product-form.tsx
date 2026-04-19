"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { startTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/dal/types";
import { cn } from "@/lib/utils";
import { useCreateProduct } from "@/mutations/products";

interface ProductFormProps {
  orgId: string;
  onOptimistic?: (data: Product) => void;
  isModal?: boolean;
}

export function ProductForm({
  orgId,
  onOptimistic,
  isModal,
}: ProductFormProps) {
  const { mutate, isPending } = useCreateProduct();

  const form = useForm({
    defaultValues: {
      name: "",
      price: 0,
    },
    onSubmit: async ({ value }) => {
      const fullData: Product = {
        ...value,
        id: crypto.randomUUID(),
        price: Number(value.price),
        org_id: orgId,
        status: "active",
      };

      if (onOptimistic) {
        startTransition(() => {
          onOptimistic(fullData);
        });
      }

      mutate({
        name: value.name,
        price: Number(value.price),
        status: "active",
      });
    },
  });

  const content = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="space-y-4">
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Product Name</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Consulting Fee"
              />
              {field.state.meta.errors.length > 0 && (
                <em className="text-sm text-destructive">
                  {field.state.meta.errors.join(", ")}
                </em>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="price">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Standard Price</Label>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                step="0.01"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                placeholder="0.00"
              />
              {field.state.meta.errors.length > 0 && (
                <em className="text-sm text-destructive">
                  {field.state.meta.errors.join(", ")}
                </em>
              )}
            </div>
          )}
        </form.Field>
      </div>

      <div
        className={cn(
          "flex justify-end gap-3 mt-6",
          isModal && "pt-4 border-t",
        )}
      >
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Product"
          )}
        </Button>
      </div>
    </form>
  );

  if (isModal) {
    return content;
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Product</CardTitle>
        <CardDescription>
          Define a new product or service for your invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}