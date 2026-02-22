import { getCustomers } from "@/dal/customers";
import { getProducts } from "@/dal/products";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage() {
  const [customers, products] = await Promise.all([
    getCustomers(),
    getProducts(),
  ]);

  return (
    <div className="container mx-auto py-10 px-4">
      <InvoiceForm customers={customers} products={products} />
    </div>
  );
}
