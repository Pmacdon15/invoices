import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/dal/products";
import { ProductsTable } from "../../components/products-table";

export default async function ProductsPage() {
  const data = getProducts();

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your goods and services.
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>
      <Suspense>
        <ProductsTable dataPromise={data} />
      </Suspense>
    </div>
  );
}
