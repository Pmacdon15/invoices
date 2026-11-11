"use client";

import { useAuth } from "@clerk/nextjs";
import { Hash, Loader2 } from "lucide-react";
import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { OrgSettings, Result } from "@/dal/types";
import {
  formatInvoiceNumber,
  MAX_INVOICE_PREFIX_LENGTH,
} from "@/lib/invoice-number";
import { useUpdateInvoicePrefix } from "@/mutations/org-settings";

/**
 * The organization's invoice numbering: the prefix new invoices get, which
 * admins can change. Invoices already made keep their number.
 */
export function InvoicePrefixSetting({
  settingsPromise,
}: {
  settingsPromise: Promise<Result<OrgSettings>>;
}) {
  const { orgRole } = useAuth();
  const { data, error } = use(settingsPromise);
  const [prefix, setPrefix] = useState(data?.invoice_prefix ?? "");
  const { mutate, isPending } = useUpdateInvoicePrefix();

  if (error !== null) return null;

  const isAdmin = orgRole === "org:admin";
  const next = formatInvoiceNumber(
    data.last_invoice_number + 1,
    prefix.trim() || data.invoice_prefix,
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Hash className="h-4 w-4" /> Numbering
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutate(prefix.trim());
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="invoice_prefix">Invoice number prefix</Label>
            <Input
              id="invoice_prefix"
              value={prefix}
              maxLength={MAX_INVOICE_PREFIX_LENGTH}
              disabled={!isAdmin}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Next invoice: <span className="font-mono">{next}</span>. Invoices
            already made keep their number.
          </p>
          {isAdmin ? (
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only an organization admin can change the prefix.
            </p>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}
