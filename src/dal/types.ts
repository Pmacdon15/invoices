import type { z } from "zod";
import type {
  BrandingSchema,
  CreateBrandingSchema,
  CreateCustomerSchema,
  CreateInvoiceSchema,
  CreateProductSchema,
  CustomerSchema,
  InvoiceItemSchema,
  InvoiceSchema,
  ProductSchema,
} from "./schema";

export type Customer = z.infer<typeof CustomerSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type Branding = z.infer<typeof BrandingSchema>;

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type CreateBrandingInput = z.infer<typeof CreateBrandingSchema>;

export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string };
