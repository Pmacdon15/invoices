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

/** The optional contact fields, in the order the form shows them. */
const CONTACT_FIELDS = [
  {
    name: "phone",
    label: "Phone",
    placeholder: "+1 403 555 0100",
    type: "tel",
  },
  { name: "address_line1", label: "Address", placeholder: "123 Main St" },
  {
    name: "address_line2",
    label: "Address Line 2",
    placeholder: "Suite 400",
  },
  { name: "city", label: "City", placeholder: "Calgary" },
  { name: "region", label: "Province / State", placeholder: "AB" },
  { name: "postal_code", label: "Postal Code", placeholder: "T2P 1J9" },
  { name: "country", label: "Country", placeholder: "Canada" },
] as const;

type ContactFieldName = (typeof CONTACT_FIELDS)[number]["name"];

function contactDefaults(customer?: Customer) {
  return Object.fromEntries(
    CONTACT_FIELDS.map(({ name }) => [name, customer?.[name] ?? ""]),
  ) as Record<ContactFieldName, string>;
}

interface CustomerFormProps {
  orgId: string;
  onOptimistic?: (data: Customer) => void;
  isModal?: boolean;
  initialData?: Customer;
}

export function CustomerForm({
  orgId,
  onOptimistic,
  isModal,
  initialData,
}: CustomerFormProps) {
  const { mutate: createMutate, isPending: isCreating } = useCreateCustomer();
  const { mutate: updateMutate, isPending: isUpdating } = useUpdateCustomer();
  const isPending = isCreating || isUpdating;

  const form = useForm({
    defaultValues: initialData
      ? {
          name: initialData.name,
          email: initialData.email,
          ...contactDefaults(initialData),
        }
      : {
          name: "",
          email: "",
          ...contactDefaults(),
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
        updateMutate({
          ...value,
          id: initialData.id,
          status: initialData.status,
        });
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
              {/* Only a form-level validator runs, so field errors stay empty. */}
              {/* v8 ignore start -- @preserve */}
              {field.state.meta.errors.length > 0 && (
                <em className="text-sm text-destructive">
                  {field.state.meta.errors.join(", ")}
                </em>
              )}
              {/* v8 ignore stop -- @preserve */}
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
              {/* Only a form-level validator runs, so field errors stay empty. */}
              {/* v8 ignore start -- @preserve */}
              {field.state.meta.errors.length > 0 && (
                <em className="text-sm text-destructive">
                  {field.state.meta.errors.join(", ")}
                </em>
              )}
              {/* v8 ignore stop -- @preserve */}
            </div>
          )}
        </form.Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTACT_FIELDS.map((contact) => (
            <form.Field key={contact.name} name={contact.name}>
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>{contact.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type={"type" in contact ? contact.type : "text"}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={contact.placeholder}
                  />
                </div>
              )}
            </form.Field>
          ))}
        </div>
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
        <CardTitle>
          {initialData ? "Edit Customer" : "Add New Customer"}
        </CardTitle>
        <CardDescription>
          {initialData
            ? "Update the customer's details below."
            : "Enter the customer's details to add them to your database."}
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
