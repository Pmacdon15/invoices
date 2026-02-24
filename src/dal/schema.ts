import { z } from "zod";

// --- Customer ---
export const CustomerSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  org_id: z.string(),
});

export const CreateCustomerSchema = CustomerSchema.omit({
  id: true,
  org_id: true,
});

// --- Product ---
export const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  price: z.number().positive("Price must be positive"),
  org_id: z.string(),
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  org_id: true,
});

// --- Invoice Item ---
export const InvoiceItemSchema = z.object({
  id: z.uuid(),
  invoice_id: z.uuid(),
  product_id: z.uuid("Please select a product"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unit_price: z.number().nonnegative("Price cannot be negative"),
  product: ProductSchema.optional(),
});

export const CreateInvoiceItemSchema = InvoiceItemSchema.omit({
  id: true,
  invoice_id: true,
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

export const InvoiceSchema = z.object({
  id: z.uuid(),
  customer_id: z.uuid("Please select a customer"),
  total: z.number().nonnegative(),
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
