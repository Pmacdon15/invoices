import { Suspense } from "react";
import { CustomersManagement } from "@/components/management/customers-management";
import { SearchSelector } from "@/components/ui/search-selector";
import { getCustomers } from "@/dal/customers";

export default async function CustomersPage(props: PageProps<"/customers">) {
  const dataPromise = props.searchParams.then((params) => {
    const page =
      Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
    const query = Array.isArray(params.query) ? params.query[0] : params.query;
    return getCustomers(page, false, query);
  });

  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Suspense>
          <SearchSelector
            placeholder="Search customers..."
            apiEndpoint="/api/customers/search"
          />
        </Suspense>
      </div>
      <Suspense fallback={<div>Loading customers...</div>}>
        <CustomersManagement resultsPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
