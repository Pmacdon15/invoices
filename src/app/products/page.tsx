import { Suspense } from "react";
import { ProductsManagement } from "@/components/management/products-management";
import { getProducts } from "@/dal/products";
import { SearchSelector } from "@/components/ui/search-selector";

export default async function ProductsPage(props: PageProps<"/products">) {
  const dataPromise = props.searchParams.then((searchParams) => {
    const page =
      Number(
        Array.isArray(searchParams.page)
          ? searchParams.page[0]
          : searchParams.page,
      ) || 1;
    const query = Array.isArray(searchParams.query)
      ? searchParams.query[0]
      : searchParams.query;
    return getProducts(page, false, query);
  });

  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <SearchSelector
          placeholder="Search products..."
          apiEndpoint="/api/products/search"
        />
      </div>
      <Suspense fallback={<div>Loading products...</div>}>
        <ProductsManagement dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
