import type { CreateProductInput, Product } from "./types";

const ORG_ID = "org001a";

// Mock database
const products: Product[] = [
  { id: "p1", name: "Service A", price: 100, org_id: ORG_ID },
  { id: "p2", name: "Product B", price: 50, org_id: ORG_ID },
];

export async function getProducts(): Promise<Product[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return products.filter((p) => p.org_id === ORG_ID);
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newProduct: Product = {
    ...input,
    id: Math.random().toString(36).substring(7),
    org_id: ORG_ID,
  };
  products.push(newProduct);
  return newProduct;
}
