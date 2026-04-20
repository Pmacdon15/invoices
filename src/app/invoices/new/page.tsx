import { Suspense } from "react";
import NewInvoiceFallback from "@/components/fallbacks/new-invoice-fallback";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { getCustomers } from "@/dal/customers";
import { getProducts } from "@/dal/products";

export default function PageProps() {
  const customersPromise = getCustomers(1, true);
  const productsPromise = getProducts(1, true);
  return (
    <div className="flex md:mt-16 w-full">
      <Suspense fallback={<NewInvoiceFallback />}>
        <InvoiceForm
          customersPromise={customersPromise}
          productsPromise={productsPromise}
        />
      </Suspense>
    </div>
  );
}
