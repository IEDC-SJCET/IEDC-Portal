/**
 * pdf-lib's standard fonts are WinAnsi-encoded and THROW on any character
 * outside that range. Student names and event titles are user input, so every
 * string must pass through here before it reaches drawText — otherwise a single
 * emoji or curly quote in an event title fails the whole batch.
 */
export function sanitizeForPdf(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/[…]/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[•]/g, "-")
    // Drop anything WinAnsi cannot represent (emoji, CJK, control chars).
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}