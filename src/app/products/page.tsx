import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/dal/products";
import { ProductsTable } from "../../components/tables/products-table";

export default async function ProductsPage(props: PageProps<"/products">) {
  const dataPromise = props.searchParams.then((params) =>
    getProducts(
      Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1,
    ),
  );

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
        <ProductsTable dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
