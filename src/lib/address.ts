import type { Customer } from "@/dal/types";

type ContactFields = Pick<
  Customer,
  | "phone"
  | "address_line1"
  | "address_line2"
  | "city"
  | "region"
  | "postal_code"
  | "country"
>;

/**
 * A customer's postal address as display lines, skipping blank parts:
 * street lines, then "City, Region Postal", then the country.
 */
export function addressLines(customer: Partial<ContactFields>): string[] {
  const locality = [
    [customer.city, customer.region].filter(Boolean).join(", "),
    customer.postal_code,
  ]
    .filter(Boolean)
    .join(" ");
  return [
    customer.address_line1,
    customer.address_line2,
    locality,
    customer.country,
  ].filter((line): line is string => Boolean(line));
}

/** Blank contact text as NULL, so the database never stores empty strings. */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
