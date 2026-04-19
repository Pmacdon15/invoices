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
import type { Customer } from "@/dal/types";
import { cn } from "@/lib/utils";
import { useCreateCustomer, useUpdateCustomer } from "@/mutations/customers";

interface CustomerFormProps {
  orgId: string;
  onOptimistic?: (data: Customer) => void;
  isModal?: boolean;
  initialData?: Customer;
}

export function CustomerForm({ orgId, onOptimistic, isModal, initialData }: CustomerFormProps) {
  const { mutate: createMutate, isPending: isCreating } = useCreateCustomer();
  const { mutate: updateMutate, isPending: isUpdating } = useUpdateCustomer();
  const isPending = isCreating || isUpdating;

  const form = useForm({
    defaultValues: initialData 
      ? {
          name: initialData.name,
          email: initialData.email,
        }
      : {
          name: "",
          email: "",
        },
    onSubmit: async ({ value }) => {
      const fullData: Customer = {
        ...value,
        id: initialData ? initialData.id : crypto.randomUUID(),
        org_id: orgId,
        status: initialData ? initialData.status : "active",
      };

      if (onOptimistic) {
        startTransition(() => {
          onOptimistic(fullData);
        });
      }
      
      if (initialData) {
        updateMutate({ ...value, id: initialData.id, status: initialData.status });
      } else {
        createMutate({ ...value, status: "active" });
      }
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
              <Label htmlFor={field.name}>Company Name</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Acme Corp"
              />
              {field.state.meta.errors.length > 0 && (
                <em className="text-sm text-destructive">
                  {field.state.meta.errors.join(", ")}
                </em>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Email Address</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="billing@acme.com"
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
          ) : initialData ? (
            "Update Customer"
          ) : (
            "Save Customer"
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
        <CardTitle>{initialData ? "Edit Customer" : "Add New Customer"}</CardTitle>
        <CardDescription>
          {initialData ? "Update the customer's details below." : "Enter the customer's details to add them to your database."}
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}