"use client";

import { useForm } from "@tanstack/react-form";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
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
import { createProductAction } from "../actions";

export function ProductForm() {
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      price: 0,
    },
    onSubmit: async ({ value }) => {
      setIsPending(true);
      try {
        await createProductAction({
          name: value.name,
          price: Number(value.price),
        });
      } finally {
        setIsPending(false);
      }
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
          <div className="space-y-2">
            <form.Field
              name="name"
              children={(field) => (
                <>
                  <Label htmlFor={field.name}>Product Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Consulting Fee"
                  />
                </>
              )}
            />
          </div>
          <div className="space-y-2">
            <form.Field
              name="price"
              children={(field) => (
                <>
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
                </>
              )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button asChild variant="ghost">
            <Link href="/products">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Product
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
