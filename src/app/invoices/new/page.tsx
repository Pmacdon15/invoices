import { Suspense } from "react";
import { getCustomers } from "@/dal/customers";
import { getProducts } from "@/dal/products";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage() {
  const customersPromise = getCustomers();
  const productsPromise = getProducts();

  return (
    <div className="container mx-auto py-10 px-4">
      <Suspense>
        <InvoiceForm
          customersPromise={customersPromise}
          productsPromise={productsPromise}
        />
      </Suspense>
    </div>
  );
}
