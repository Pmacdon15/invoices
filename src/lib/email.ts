const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape a value for safe interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Remove CR/LF so a value cannot start a new email header. */
export function stripHeaderNewlines(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Encode a value as RFC 2047 encoded-words for use in an email header.
 * Base64 keeps non-ASCII text intact and cannot carry CR/LF into the header.
 * Long values are split into several encoded-words (each under the 75-char
 * limit) without splitting a multi-byte character.
 */
export function encodeEmailHeader(value: string): string {
  const clean = stripHeaderNewlines(value);
  const words: string[] = [];
  let chunk = "";
  for (const ch of clean) {
    if (Buffer.byteLength(chunk + ch, "utf8") > 45) {
      words.push(chunk);
      chunk = "";
    }
    chunk += ch;
  }
  words.push(chunk);
  return words
    .map((w) => `=?UTF-8?B?${Buffer.from(w, "utf8").toString("base64")}?=`)
    .join(" ");
}
