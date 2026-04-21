import { Loader2, PlusCircle } from "lucide-react"; // Import Loader2
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export default function InvoicesFallback() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">
            Managing your billing and payments.
          </p>
          <div className="flex items-center gap-2">
            <Select value={"all"}>
              <SelectTrigger className="w-37.5">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="flex items-center gap-2" disabled>
          <PlusCircle className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      {/* Spinner Section */}
      <div className="flex flex-col items-center justify-center min-h-100 border rounded-lg bg-card/50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Loading invoices...
        </p>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>Total Invoices: --</span>
        <span>Page -- of --</span>
      </div>
    </div>
  );
}
