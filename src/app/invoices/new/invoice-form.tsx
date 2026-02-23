"use client";

import { useForm } from "@tanstack/react-form";
import { ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer, Product } from "@/dal/types";
import { createInvoiceAction } from "../actions";

interface InvoiceFormProps {
  customers: Customer[];
  products: Product[];
}

export function InvoiceForm({ dataPromise }: InvoiceFormProps) {
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm({
    defaultValues: {
      customer_id: "",
      status: "draft" as const,
      items: [{ product_id: "", quantity: 1, unit_price: 0 }],
    },
    onSubmit: async ({ value }) => {
      setIsPending(true);
      try {
        await createInvoiceAction(value);
      } finally {
        setIsPending(false);
      }
    },
  });

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Button asChild variant="ghost" size="icon" className="-ml-2">
            <Link href="/invoices">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <CardTitle>Create New Invoice</CardTitle>
        </div>
        <CardDescription>
          Generate a new invoice by selecting a customer and adding products.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <form.Field
                name="customer_id"
                children={(field) => (
                  <>
                    <Label htmlFor={field.name}>Customer</Label>
                    <Select
                      onValueChange={field.handleChange}
                      defaultValue={field.state.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              />
            </div>
            <div className="space-y-2">
              <form.Field
                name="status"
                children={(field) => (
                  <>
                    <Label htmlFor={field.name}>Status</Label>
                    <Select
                      onValueChange={(value) =>
                        field.handleChange(value as any)
                      }
                      defaultValue={field.state.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  form.pushFieldValue("items", {
                    product_id: "",
                    quantity: 1,
                    unit_price: 0,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Product</th>
                    <th className="px-4 py-2 text-left font-medium w-24">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-left font-medium w-32">
                      Price
                    </th>
                    <th className="px-4 py-2 text-right font-medium w-32">
                      Total
                    </th>
                    <th className="px-4 py-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <form.Field
                    name="items"
                    children={(field) => (
                      <>
                        {field.state.value.map((_, i) => (
                          <tr key={i}>
                            <td className="p-2">
                              <form.Field
                                name={`items[${i}].product_id`}
                                children={(subField) => (
                                  <Select
                                    onValueChange={(val) => {
                                      subField.handleChange(val);
                                      const product = products.find(
                                        (p) => p.id === val,
                                      );
                                      if (product) {
                                        form.setFieldValue(
                                          `items[${i}].unit_price`,
                                          product.price,
                                        );
                                      }
                                    }}
                                    defaultValue={subField.state.value}
                                  >
                                    <SelectTrigger className="border-none shadow-none focus:ring-0">
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map((product) => (
                                        <SelectItem
                                          key={product.id}
                                          value={product.id}
                                        >
                                          {product.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </td>
                            <td className="p-2">
                              <form.Field
                                name={`items[${i}].quantity`}
                                children={(subField) => (
                                  <Input
                                    type="number"
                                    min="1"
                                    className="border-none shadow-none focus:ring-0"
                                    value={subField.state.value}
                                    onChange={(e) =>
                                      subField.handleChange(
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                )}
                              />
                            </td>
                            <td className="p-2">
                              <form.Field
                                name={`items[${i}].unit_price`}
                                children={(subField) => (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="border-none shadow-none focus:ring-0"
                                    value={subField.state.value}
                                    onChange={(e) =>
                                      subField.handleChange(
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                )}
                              />
                            </td>
                            <td className="p-2 text-right font-medium">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(
                                (form.getFieldValue(`items[${i}].quantity`) ||
                                  0) *
                                  (form.getFieldValue(
                                    `items[${i}].unit_price`,
                                  ) || 0),
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  form.removeFieldValue("items", i)
                                }
                                disabled={field.state.value.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  />
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pr-14 py-4">
              <div className="flex flex-col gap-1 items-end">
                <span className="text-sm text-muted-foreground uppercase font-semibold">
                  Total Amount
                </span>
                <span className="text-3xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(
                    form
                      .getFieldValue("items")
                      .reduce(
                        (sum, item) => sum + item.quantity * item.unit_price,
                        0,
                      ),
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button asChild variant="ghost">
            <Link href="/invoices">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
