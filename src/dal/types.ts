export interface Customer {
  id: string;
  name: string;
  email: string;
  org_id: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  org_id: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Invoice {
  id: string;
  customer_id: string;
  total: number;
  status: "draft" | "sent" | "paid";
  org_id: string;
  created_at: string;
  customer?: Customer;
  items?: InvoiceItem[];
}

export type CreateCustomerInput = Omit<Customer, "id" | "org_id">;
export type CreateProductInput = Omit<Product, "id" | "org_id">;
export type CreateInvoiceInput = Omit<
  Invoice,
  "id" | "org_id" | "created_at" | "total"
> & {
  items: Omit<InvoiceItem, "id" | "invoice_id">[];
};
