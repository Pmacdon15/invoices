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
import { useCreateCustomer } from "@/mutations/customers";
// import { createCustomerAction } from "./actions";

export function CustomerForm() {
  const { mutate, isPending } = useCreateCustomer();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      await mutate(value);
    },
  });

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Button asChild variant="ghost" size="icon" className="-ml-2">
            <Link href="/customers">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <CardTitle>Add New Customer</CardTitle>
        </div>
        <CardDescription>
          Enter the customer's details to add them to your database.
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
          {/* Company Name Field */}
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

          {/* Email Address Field */}
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
        </CardContent>

        <CardFooter className="flex justify-between border-t p-6 mt-4">
          <Button asChild variant="ghost" type="button">
            <Link href="/customers">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Customer"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
