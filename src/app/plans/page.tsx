import { PricingTable } from "@clerk/nextjs";

export default function PlansPage() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
          Simple, Transparent <span className="text-primary">Pricing</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Choose the plan that's right for your business.
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        <PricingTable for='organization' />
      </div>
    </div>
  );
}
