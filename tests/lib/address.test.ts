import { describe, expect, it } from "vitest";
import { addressLines, blankToNull } from "@/lib/address";

describe("addressLines", () => {
  it("formats street lines, locality and country, skipping blanks", () => {
    expect(
      addressLines({
        address_line1: "1 Main St",
        address_line2: "Suite 4",
        city: "Calgary",
        region: "AB",
        postal_code: "T2P 1J9",
        country: "Canada",
      }),
    ).toEqual(["1 Main St", "Suite 4", "Calgary, AB T2P 1J9", "Canada"]);
    expect(addressLines({ region: "AB" })).toEqual(["AB"]);
    expect(addressLines({ postal_code: "T2P" })).toEqual(["T2P"]);
    expect(addressLines({ city: "Calgary", address_line2: null })).toEqual([
      "Calgary",
    ]);
    expect(addressLines({})).toEqual([]);
  });
});

describe("blankToNull", () => {
  it("trims, and stores blanks as null", () => {
    expect(blankToNull(" a ")).toBe("a");
    expect(blankToNull("   ")).toBeNull();
    expect(blankToNull("")).toBeNull();
    expect(blankToNull(null)).toBeNull();
    expect(blankToNull(undefined)).toBeNull();
  });
});
