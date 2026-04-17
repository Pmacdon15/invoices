import { Suspense } from "react";
import { CustomersManagement } from "@/components/management/customers-management";
import { getCustomers } from "@/dal/customers";

export default async function CustomersPage(props: PageProps<"/customers">) {
  const dataPromise = props.searchParams.then((params) =>
    getCustomers(
      Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1,
    ),
  );

  return (
    <div className="container mx-auto py-10 px-4">
      <Suspense fallback={<div>Loading customers...</div>}>
        <CustomersManagement resultsPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
