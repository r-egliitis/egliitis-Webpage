// Day Log full-text search helpers. Pure.

/** Search words from free text: letters and digits only (any language), lower-case, max 8. */
export function searchWords(query: string): string[] {
  return (query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8);
}

/**
 * A Postgres tsquery (config 'simple'): every word must appear; the last one
 * also matches as a prefix, so "coff" finds "coffee" while you type.
 * Only letters/digits get through, so the result is always valid syntax.
 */
export function toTsQuery(query: string): string | null {
  const words = searchWords(query);
  if (words.length === 0) return null;
  return words.map((word, index) => (index === words.length - 1 ? `${word}:*` : word)).join(" & ");
}

/** Splits text into plain and matched parts for highlighting (prefix matches too). */
export function highlightParts(text: string, words: string[]): { text: string; match: boolean }[] {
  if (words.length === 0) return [{ text, match: false }];
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join("|")})[\\p{L}\\p{N}]*`, "giu");
  const parts: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const index = found.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index), match: false });
    parts.push({ text: found[0], match: true });
    last = index + found[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}
