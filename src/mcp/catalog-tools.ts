import { z } from "zod";
import {
  createCustomerDal,
  deleteCustomerDal,
  getCustomerByIdDal,
  getCustomers,
  updateCustomerDal,
} from "@/dal/customers";
import {
  createProductDal,
  deleteProductDal,
  getProductByIdDal,
  getProducts,
  updateProductDal,
} from "@/dal/products";
import type { Customer, Product } from "@/dal/types";
import { addressLines } from "@/lib/address";
import type { CallerContext } from "@/mcp/caller";
import {
  dalFailure,
  failure,
  invalidate,
  money,
  type ToolResult,
} from "@/mcp/results";

/*
 * Customer and product tools: the same reads, plan limits and soft deletes as
 * the Customers and Products pages, through the shared data layer.
 */

export const orgIdField = z
  .string()
  .optional()
  .describe(
    "Organization ID (org_...), slug or name. Leave out when the user belongs to one organization.",
  );

const pageField = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe("Page of results, 10 per page. Defaults to 1.");

const contactText = (max: number, what: string) =>
  z.string().max(max).optional().describe(what);

/** The customer's contact fields, as tool inputs. Blank clears a field. */
export const customerContactFields = {
  phone: contactText(40, "Phone number."),
  address_line1: contactText(200, "Street address."),
  address_line2: contactText(200, "Suite, unit or second address line."),
  city: contactText(100, "City."),
  region: contactText(100, "Province or state."),
  postal_code: contactText(20, "Postal or ZIP code."),
  country: contactText(100, "Country."),
};

export type CustomerContactInput = {
  [K in keyof typeof customerContactFields]?: string;
};

/** A customer as tools return it. */
export function customerView(customer: Customer) {
  return {
    customer_id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone ?? null,
    address_line1: customer.address_line1 ?? null,
    address_line2: customer.address_line2 ?? null,
    city: customer.city ?? null,
    region: customer.region ?? null,
    postal_code: customer.postal_code ?? null,
    country: customer.country ?? null,
    address: addressLines(customer).join(", ") || null,
    status: customer.status,
  };
}

/** A product as tools return it. */
export function productView(product: Product) {
  return {
    product_id: product.id,
    name: product.name,
    price: Number(product.price),
    status: product.status,
  };
}

// ---------- customers ----------

export const listCustomersInputSchema = z.object({
  org_id: orgIdField,
  query: z
    .string()
    .max(200)
    .optional()
    .describe("Filter by part of the name or email."),
  page: pageField,
});

export async function listCustomersTool(
  ctx: CallerContext,
  args: z.infer<typeof listCustomersInputSchema>,
): Promise<ToolResult> {
  const page = args.page ?? 1;
  const result = await getCustomers(page, false, args.query || undefined, ctx);
  if (result.error !== null) return failure(result.error);
  const customers = result.data.data.map(customerView);
  return {
    summary:
      result.data.totalCount === 0
        ? args.query
          ? `No customers match "${args.query}".`
          : "There are no customers yet."
        : `${result.data.totalCount} customer(s); page ${page} of ${result.data.totalPages}.`,
    data: {
      customers,
      page,
      total_pages: result.data.totalPages,
      total_count: result.data.totalCount,
    },
  };
}

export const getCustomerInputSchema = z.object({
  org_id: orgIdField,
  customer_id: z.string().describe("The customer's ID (from list_customers)."),
});

export async function getCustomerTool(
  ctx: CallerContext,
  args: z.infer<typeof getCustomerInputSchema>,
): Promise<ToolResult> {
  const result = await getCustomerByIdDal(args.customer_id, ctx);
  if (result.error !== null) return failure(result.error);
  return {
    summary: `${result.data.name} <${result.data.email}>.`,
    data: { customer: customerView(result.data) },
  };
}

export const createCustomerInputSchema = z.object({
  org_id: orgIdField,
  name: z.string().min(2).max(200).describe("Customer or company name."),
  email: z.string().max(320).describe("Email address invoices are sent to."),
  ...customerContactFields,
});

/** Creates a customer; shared with create_invoice's `new_customer`. */
export async function createCustomer(
  ctx: CallerContext,
  input: { name: string; email: string } & CustomerContactInput,
) {
  const result = await createCustomerDal({ ...input, status: "active" }, ctx);
  if (result.isOk()) invalidate(ctx.orgId, ["customers", "stats"]);
  return result;
}

export async function createCustomerTool(
  ctx: CallerContext,
  args: z.infer<typeof createCustomerInputSchema>,
): Promise<ToolResult> {
  const { org_id: _org, ...input } = args;
  const result = await createCustomer(ctx, input);
  if (result.isErr()) return dalFailure(result.error);
  return {
    summary: `Added customer ${result.value.name} <${result.value.email}>.`,
    data: { customer: customerView(result.value) },
  };
}

export const updateCustomerInputSchema = z.object({
  org_id: orgIdField,
  customer_id: z.string().describe("The customer's ID (from list_customers)."),
  name: z.string().min(2).max(200).optional().describe("New name."),
  email: z.string().max(320).optional().describe("New email address."),
  ...customerContactFields,
});

export async function updateCustomerTool(
  ctx: CallerContext,
  args: z.infer<typeof updateCustomerInputSchema>,
): Promise<ToolResult> {
  const current = await getCustomerByIdDal(args.customer_id, ctx);
  if (current.error !== null) return failure(current.error);
  const { org_id: _org, customer_id, ...changes } = args;
  const merged = { ...current.data, ...changes, id: customer_id };
  const result = await updateCustomerDal(
    {
      id: merged.id,
      name: merged.name,
      email: merged.email,
      phone: merged.phone,
      address_line1: merged.address_line1,
      address_line2: merged.address_line2,
      city: merged.city,
      region: merged.region,
      postal_code: merged.postal_code,
      country: merged.country,
      status: current.data.status,
    },
    ctx,
  );
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["customers", "invoices"]);
  return {
    summary: `Updated ${result.value.name}. Their existing invoices show the new details too.`,
    data: { customer: customerView(result.value) },
  };
}

export const deleteCustomerInputSchema = z.object({
  org_id: orgIdField,
  customer_id: z.string().describe("The customer's ID (from list_customers)."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Pass true only after the user has agreed to delete this customer. Without it nothing is deleted and you get a preview to show them.",
    ),
});

export async function deleteCustomerTool(
  ctx: CallerContext,
  args: z.infer<typeof deleteCustomerInputSchema>,
): Promise<ToolResult> {
  const current = await getCustomerByIdDal(args.customer_id, ctx);
  if (current.error !== null) return failure(current.error);
  if (!args.confirm) {
    return {
      summary: `Delete customer ${current.data.name} <${current.data.email}>? They'll be removed from the customer list and can't be picked for new invoices; existing invoices stay. Ask the user, then call delete_customer again with confirm: true.`,
      data: {
        status: "needs_confirmation",
        customer: customerView(current.data),
      },
    };
  }
  const result = await deleteCustomerDal(args.customer_id, ctx);
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["customers", "stats"]);
  return {
    summary: `Deleted customer ${result.value.name}.`,
    data: { status: "deleted", customer_id: result.value.id },
  };
}

// ---------- products ----------

export const listProductsInputSchema = z.object({
  org_id: orgIdField,
  query: z
    .string()
    .max(200)
    .optional()
    .describe("Filter by part of the product name."),
  page: pageField,
});

export async function listProductsTool(
  ctx: CallerContext,
  args: z.infer<typeof listProductsInputSchema>,
): Promise<ToolResult> {
  const page = args.page ?? 1;
  const result = await getProducts(page, false, args.query || undefined, ctx);
  if (result.error !== null) return failure(result.error);
  return {
    summary:
      result.data.totalCount === 0
        ? args.query
          ? `No products match "${args.query}".`
          : "There are no products yet."
        : `${result.data.totalCount} product(s); page ${page} of ${result.data.totalPages}.`,
    data: {
      products: result.data.data.map(productView),
      page,
      total_pages: result.data.totalPages,
      total_count: result.data.totalCount,
    },
  };
}

export const createProductInputSchema = z.object({
  org_id: orgIdField,
  name: z.string().min(2).max(200).describe("Product or service name."),
  price: z.number().min(0.01).describe("Unit price in dollars, e.g. 125.5."),
});

export async function createProductTool(
  ctx: CallerContext,
  args: z.infer<typeof createProductInputSchema>,
): Promise<ToolResult> {
  const result = await createProductDal(
    { name: args.name, price: args.price, status: "active" },
    ctx,
  );
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["products"]);
  return {
    summary: `Added product ${result.value.name} at ${money.format(Number(result.value.price))}.`,
    data: { product: productView(result.value) },
  };
}

export const updateProductInputSchema = z.object({
  org_id: orgIdField,
  product_id: z.string().describe("The product's ID (from list_products)."),
  name: z.string().min(2).max(200).optional().describe("New name."),
  price: z
    .number()
    .min(0.01)
    .optional()
    .describe(
      "New unit price in dollars. Applies to invoices made from now on; existing invoices keep the price they were made with.",
    ),
});

export async function updateProductTool(
  ctx: CallerContext,
  args: z.infer<typeof updateProductInputSchema>,
): Promise<ToolResult> {
  const current = await getProductByIdDal(args.product_id, ctx);
  if (current.error !== null) return failure(current.error);
  const result = await updateProductDal(
    {
      id: args.product_id,
      name: args.name ?? current.data.name,
      price: args.price ?? Number(current.data.price),
      status: current.data.status,
    },
    ctx,
  );
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["products", "invoices"]);
  return {
    summary: `Updated ${result.value.name}: ${money.format(Number(result.value.price))}. Existing invoices keep their prices.`,
    data: { product: productView(result.value) },
  };
}

export const deleteProductInputSchema = z.object({
  org_id: orgIdField,
  product_id: z.string().describe("The product's ID (from list_products)."),
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Pass true only after the user has agreed to delete this product. Without it nothing is deleted and you get a preview to show them.",
    ),
});

export async function deleteProductTool(
  ctx: CallerContext,
  args: z.infer<typeof deleteProductInputSchema>,
): Promise<ToolResult> {
  const current = await getProductByIdDal(args.product_id, ctx);
  if (current.error !== null) return failure(current.error);
  if (!args.confirm) {
    return {
      summary: `Delete product ${current.data.name} (${money.format(Number(current.data.price))})? It can't be added to new invoices afterwards; existing invoices keep it. Ask the user, then call delete_product again with confirm: true.`,
      data: {
        status: "needs_confirmation",
        product: productView(current.data),
      },
    };
  }
  const result = await deleteProductDal(args.product_id, ctx);
  if (result.isErr()) return dalFailure(result.error);
  invalidate(ctx.orgId, ["products"]);
  return {
    summary: `Deleted product ${result.value.name}.`,
    data: { status: "deleted", product_id: result.value.id },
  };
}
