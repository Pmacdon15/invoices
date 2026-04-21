import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";

export default function CustomersFallback() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage your customer database.</p>
        <Button className="flex items-center gap-2" disabled>
          <PlusCircle className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      {/* Spinner Section */}
      <div className="flex flex-col items-center justify-center min-h-100 border rounded-lg bg-card/50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Loading customers...
        </p>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>Total Customers: --</span>
        <span>Page -- of --</span>
      </div>
    </div>
  );
}
