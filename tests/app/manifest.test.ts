import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("web app manifest", () => {
  it("describes an installable standalone app with existing icons", () => {
    const m = manifest();
    expect(m.short_name).toBe("InvoicePro");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    const sizes = m.icons?.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of m.icons ?? []) {
      expect(existsSync(resolve(process.cwd(), "public", `.${icon.src}`))).toBe(
        true,
      );
    }
    expect(existsSync(resolve(process.cwd(), "public", "sw.js"))).toBe(true);
  });
});
