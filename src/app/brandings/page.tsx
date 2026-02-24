import { Suspense } from "react";
import BrandingsForm from "@/components/forms/brandings-form";
import { getBranding } from "@/dal/brandings";

export default function BrandingsPage() {
  const brandingPromise = getBranding();
  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <h1 className="text-4xl font-black mb-6 tracking-tight">BRANDING</h1>
      <Suspense fallback={<div>Loading branding details...</div>}>
        <BrandingsForm brandingPromise={brandingPromise} />
      </Suspense>
    </div>
  );
}
