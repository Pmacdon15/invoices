import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getCustomers } from "@/dal/customers";
import { CustomersTable } from "./customer-table";

export default async function CustomersPage() {
  const dataPromise = getCustomers();

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database.
          </p>
        </div>
        <Button asChild>
          <Link href="/customers/new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Add Customer
          </Link>
        </Button>
      </div>
      <Suspense>
        <CustomersTable resultsPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
