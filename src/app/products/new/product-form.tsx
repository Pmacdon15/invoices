"use client";

import { useForm } from "@tanstack/react-form";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProduct } from "@/mutations/products";

export function ProductForm() {
  const { mutate, isPending } = useCreateProduct();

  const form = useForm({
    defaultValues: {
      name: "",
      price: 0,
    },
    onSubmit: async ({ value }) => {
      // Logic handled by the mutation hook
      await mutate({
        name: value.name,
        price: Number(value.price),
      });
    },
  });

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Button asChild variant="ghost" size="icon" className="-ml-2">
            <Link href="/products">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <CardTitle>Add New Product</CardTitle>
        </div>
        <CardDescription>
          Define a new product or service for your invoices.
        </CardDescription>
      </CardHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <CardContent className="space-y-4">
          {/* Product Name Field */}
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

          {/* Price Field */}
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
        </CardContent>

        <CardFooter className="flex justify-between border-t p-6 mt-4">
          <Button asChild variant="ghost" type="button">
            <Link href="/products">Cancel</Link>
          </Button>
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
        </CardFooter>
      </form>
    </Card>
  );
}
