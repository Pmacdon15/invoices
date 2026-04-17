import { Suspense } from "react";
import { InvoicesManagement } from "@/components/management/invoices-management";
import { getCustomers } from "@/dal/customers";
import { getInvoices } from "@/dal/invoices";
import { getProducts } from "@/dal/products";

export default async function InvoicesPage(props: PageProps<"/invoices">) {
  const invoicesPromise = props.searchParams.then((params) =>
    getInvoices(
      Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1,
    ),
  );

  const customersPromise = getCustomers(1, true);
  const productsPromise = getProducts(1, true);

  return (
    <div className="container mx-auto py-10 px-4">
      <Suspense fallback={<div>Loading invoices...</div>}>
        <InvoicesManagement
          invoicesPromise={invoicesPromise}
          customersPromise={customersPromise}
          productsPromise={productsPromise}
        />
      </Suspense>
    </div>
  );
}
