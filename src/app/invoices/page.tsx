import { Suspense } from "react";
import { InvoicesManagement } from "@/components/management/invoices-management";
import { SearchSelector } from "@/components/ui/search-selector";
import { getCustomers } from "@/dal/customers";
import { getInvoices } from "@/dal/invoices";
import { getProducts } from "@/dal/products";

export default async function InvoicesPage(props: PageProps<"/invoices">) {
  const invoicesPromise = props.searchParams.then((params) => {
    const page =
      Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
    const query = Array.isArray(params.query) ? params.query[0] : params.query;
    return getInvoices(page, query);
  });

  const customersPromise = getCustomers(1, true);
  const productsPromise = getProducts(1, true);

  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Suspense>
          <SearchSelector
            placeholder="Search invoices..."
            apiEndpoint="/api/invoices/search"
          />
        </Suspense>
      </div>
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
