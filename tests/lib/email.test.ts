import { describe, expect, it } from "vitest";
import {
  encodeEmailHeader,
  escapeHtml,
  stripHeaderNewlines,
} from "@/lib/email";

const decode = (header: string) =>
  header
    .split(" ")
    .map((word) => {
      const match = word.match(/^=\?UTF-8\?B\?(.*)\?=$/);
      expect(match, word).not.toBeNull();
      return Buffer.from(match?.[1] ?? "", "base64").toString("utf8");
    })
    .join("");

describe("escapeHtml", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });

  it("stringifies non-string values", () => {
    expect(escapeHtml(12.5)).toBe("12.5");
  });

  it("turns null and undefined into an empty string", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("stripHeaderNewlines", () => {
  it("replaces CR/LF runs with a single space and trims", () => {
    expect(stripHeaderNewlines(" a@b.com\r\nBcc: evil@x.com\n\n ")).toBe(
      "a@b.com Bcc: evil@x.com",
    );
  });
});

describe("encodeEmailHeader", () => {
  it("encodes a short value as one RFC 2047 word", () => {
    const header = encodeEmailHeader("Acme Inc");
    expect(header).toBe(
      `=?UTF-8?B?${Buffer.from("Acme Inc").toString("base64")}?=`,
    );
  });

  it("cannot carry a newline into the header", () => {
    const header = encodeEmailHeader("Acme\r\nBcc: evil@x.com");
    expect(header).not.toMatch(/[\r\n]/);
    expect(decode(header)).toBe("Acme Bcc: evil@x.com");
  });

  it("splits long values into words under the 75-char limit", () => {
    const value =
      "Invoice from a very long organisation name – $1,234.56 ".repeat(3);
    const header = encodeEmailHeader(value);
    const words = header.split(" ");
    expect(words.length).toBeGreaterThan(1);
    for (const word of words) expect(word.length).toBeLessThanOrEqual(75);
    expect(decode(header)).toBe(value.trim());
  });

  it("never splits a multi-byte character across words", () => {
    const value = "é".repeat(40);
    const header = encodeEmailHeader(value);
    expect(header.split(" ").length).toBeGreaterThan(1);
    expect(decode(header)).toBe(value);
  });

  it("encodes an empty value", () => {
    expect(encodeEmailHeader("")).toBe("=?UTF-8?B??=");
  });
});
