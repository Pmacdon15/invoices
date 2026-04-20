'use client'
import { useForm } from "@tanstack/react-form";
import { Plus, Trash2 } from "lucide-react";

import { CreateInvoiceSchema } from "@/dal/schema";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface InvoiceFormProps {
  isModal?: boolean;
}

export default function NewInvoiceFallback({ isModal }: InvoiceFormProps) {
  const form = useForm({
    defaultValues: {
      customer_id: "",
      status: "draft" as const,
      items: [{ product_id: "", quantity: 1, unit_price: 0 }],
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = CreateInvoiceSchema.safeParse(value);
        if (!result.success) {
          console.log("error message: ", result.error.issues);
          return result.error.issues[0].message;
        }
        return undefined;
      },
    },

    onSubmit: async () => {},
  });

  const content = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="space-y-8">
        <form.Subscribe selector={(state) => state.errors}>
          {(errors) =>
            errors.length > 0 ? (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                <p className="font-semibold mb-1">
                  Please fix the following issues:
                </p>
                <ul className="list-disc list-inside">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null
          }
        </form.Subscribe>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Customer Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Customer</Label>

            <form.Field name="customer_id">
              {(field) => (
                <div className="space-y-1">
                  <Select
                    onValueChange={field.handleChange}
                    value={field.state.value || ""}
                  >
                    <SelectTrigger
                      className={
                        field.state.meta.errors.length
                          ? "border-destructive"
                          : ""
                      }
                    >
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent></SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Status Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Invoice Details</Label>
            <form.Field name="status">
              {(field) => (
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
                    Status
                  </Label>
                  <Select onValueChange={() => {}} value={"draft"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Draft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>                      
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
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
              className="hover:bg-primary/5 border-primary/20 text-primary"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>

          <div className="border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="hidden md:table-row">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-24">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-32">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground w-32">
                    Total
                  </th>
                  <th className="px-4 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card">
                <form.Field name="items" mode="array">
                  {(field) => (
                    <>
                      {field.state.value.map((value, i) => (
                        <tr
                          key={value.product_id}
                          className="flex flex-col md:table-row p-4 md:p-0 border-b md:border-0 relative"
                        >
                          <td className="md:px-4 md:py-3 py-2">
                            <form.Field name={`items[${i}].product_id`}>
                              {(subField) => (
                                <Select
                                  onValueChange={() => {}}
                                  value={subField.state.value}
                                >
                                  <SelectTrigger className="border-none shadow-none focus:ring-0 px-0 md:px-3 rounded-none bg-transparent">
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent></SelectContent>
                                </Select>
                              )}
                            </form.Field>
                          </td>
                          <td className="md:px-4 md:py-3 py-2">
                            <form.Field name={`items[${i}].quantity`}>
                              {(subField) => (
                                <Input
                                  type="number"
                                  className="border-none shadow-none focus:ring-0 bg-transparent"
                                  value={
                                    subField.state.value === 0
                                      ? ""
                                      : subField.state.value
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    subField.handleChange(
                                      val === "" ? 0 : Number(val),
                                    );
                                  }}
                                  onBlur={() => {
                                    if (!subField.state.value)
                                      subField.handleChange(0);
                                  }}
                                />
                              )}
                            </form.Field>
                          </td>
                          <td className="md:px-4 md:py-3 py-2">
                            <form.Field name={`items[${i}].unit_price`}>
                              {(subField) => (
                                <Input
                                  type="number"
                                  className="border-none shadow-none focus:ring-0 bg-transparent"
                                  value={
                                    subField.state.value === 0
                                      ? ""
                                      : subField.state.value
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    subField.handleChange(
                                      val === "" ? 0 : Number(val),
                                    );
                                  }}
                                  onBlur={() => {
                                    if (!subField.state.value)
                                      subField.handleChange(0);
                                  }}
                                />
                              )}
                            </form.Field>
                          </td>
                          <td className="md:px-4 md:py-3 py-2 text-right font-semibold">
                            <form.Subscribe
                              selector={(state) => state.values.items[i]}
                            >
                              {(item) => (
                                <>
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                  }).format(
                                    (item?.quantity || 0) *
                                      (item?.unit_price || 0),
                                  )}
                                </>
                              )}
                            </form.Subscribe>
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => form.removeFieldValue("items", i)}
                              disabled={field.state.value.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </form.Field>
              </tbody>
            </table>
          </div>

          <form.Subscribe selector={(state) => state.values.items}>
            {(items) => {
              const total = items.reduce(
                (sum, item) =>
                  sum + (item.quantity || 0) * (item.unit_price || 0),
                0,
              );

              return (
                <div className="flex justify-end p-6 bg-muted/20 border rounded-xl">
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-xs text-muted-foreground uppercase font-black tracking-widest">
                      Grand Total
                    </span>
                    <span className="text-4xl font-black text-primary">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(total)}
                    </span>
                  </div>
                </div>
              );
            }}
          </form.Subscribe>
        </div>
      </div>

      <div
        className={cn(
          "flex justify-end gap-3 mt-8",
          isModal && "pt-4 border-t",
        )}
      >
        <Button type="submit" size="lg">
          "Create Invoice"
        </Button>
      </div>
    </form>
  );

  if (isModal) {
    return content;
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-lg border-muted/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          "Create New Invoice
        </CardTitle>
        <CardDescription>
          Generate a new invoice by selecting a customer and adding products.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
