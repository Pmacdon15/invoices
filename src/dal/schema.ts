import { z } from "zod";

/** An optional piece of contact detail; blank or missing is stored as NULL. */
const contactField = (max: number) =>
  z.string().trim().max(max, `Must be at most ${max} characters`).nullish();

// --- Customer ---
export const CustomerSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  phone: contactField(40),
  address_line1: contactField(200),
  address_line2: contactField(200),
  city: contactField(100),
  region: contactField(100),
  postal_code: contactField(20),
  country: contactField(100),
  org_id: z.string(),
  status: z.enum(["active", "disabled", "deleted"]),
});

export const CreateCustomerSchema = CustomerSchema.omit({
  id: true,
  org_id: true,
});

export const UpdateCustomerSchema = CreateCustomerSchema.extend({
  id: z.string().uuid(),
});

// --- Product ---
export const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  price: z.coerce.number().positive("Price must be positive"),
  org_id: z.string(),
  status: z.enum(["active", "disabled", "deleted"]),
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  org_id: true,
});

export const UpdateProductSchema = CreateProductSchema.extend({
  id: z.string().uuid(),
});

// --- Invoice Item ---
export const InvoiceItemSchema = z.object({
  id: z.uuid(),
  invoice_id: z.uuid(),
  // NULL for a one-off line item, which is named by `description` instead.
  product_id: z.uuid("Please select a product").nullish(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .nullish(),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  unit_price: z.coerce.number().nonnegative("Price cannot be negative"),
  product: ProductSchema.nullish(),
});

export const CreateInvoiceItemSchema = InvoiceItemSchema.omit({
  id: true,
  invoice_id: true,
}).refine((item) => Boolean(item.product_id || item.description), {
  message: "Please select a product",
  path: ["product_id"],
});

// --- Branding ---
export const BrandingSchema = z.object({
  id: z.uuid(),
  org_id: z.string(),
  logo_url: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export const CreateBrandingSchema = BrandingSchema.omit({
  id: true,
  created_at: true,
});

// --- Invoice ---
export const InvoiceStatusSchema = z.enum(["draft", "sent", "paid"]);

export const IdSchema = z.object({
  id: z.uuid(),
});

export const UpdateInvoiceStatusSchema = z.object({
  id: z.uuid(),
  status: InvoiceStatusSchema,
});

export const InvoiceSchema = z.object({
  id: z.uuid(),
  customer_id: z.uuid("Please select a customer"),
  total: z.coerce.number().nonnegative(),
  tax_rate: z.coerce.number().nonnegative().min(0).max(100).default(0),
  // A manual total that replaces the computed one; NULL means computed.
  total_override: z.coerce
    .number()
    .nonnegative("Total cannot be negative")
    .nullish(),
  status: InvoiceStatusSchema,
  org_id: z.string(),
  created_at: z.string(),
  customer: CustomerSchema.optional(),
  items: z.array(InvoiceItemSchema).optional(),
});

export const CreateInvoiceSchema = InvoiceSchema.omit({
  id: true,
  org_id: true,
  created_at: true,
  total: true,
  customer: true,
  items: true,
}).extend({
  customer_id: z.uuid("Please select a customer"),
  items: z
    .array(CreateInvoiceItemSchema)
    .min(1, "Invoice must have at least one item"),
});

export const UpdateInvoiceSchema = CreateInvoiceSchema.extend({
  id: z.string().uuid(),
});
