import { Suspense } from "react";
import { ProductsManagement } from "@/components/management/products-management";
import { getProducts } from "@/dal/products";

export default async function ProductsPage(props: PageProps<"/products">) {
  const dataPromise = props.searchParams.then((params) =>
    getProducts(
      Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1,
    ),
  );

  return (
    <div className="container mx-auto py-10 px-4">
      <Suspense fallback={<div>Loading products...</div>}>
        <ProductsManagement dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
