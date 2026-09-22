/** Count code points so emoji and non-Latin text use the same range as Go. */
export function quoteOccurrences(content: string, quote: string): number[] {
  if (!quote) return [];
  const starts: number[] = [];
  let from = 0;
  let previousIndex = 0;
  let points = 0;
  while (from <= content.length) {
    const found = content.indexOf(quote, from);
    if (found < 0) break;
    points += Array.from(content.slice(previousIndex, found)).length;
    starts.push(points);
    previousIndex = found;
    from = found + 1;
  }
  return starts;
}

export function quoteAt(content: string, start: number, quote: string): boolean {
  if (!Number.isInteger(start) || start < 0 || !quote) return false;
  const points = Array.from(content);
  const expected = Array.from(quote);
  return start + expected.length <= points.length && points.slice(start, start + expected.length).join("") === quote;
}

export function citedParts(content: string, start: number, end: number, quote: string) {
  const points = Array.from(content);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > points.length) return null;
  const cited = points.slice(start, end).join("");
  if (cited !== quote) return null;
  return { before: points.slice(0, start).join(""), cited, after: points.slice(end).join("") };
}

export type CitationQuality = {
  status: "verified" | "mismatch";
  range: { start: number; end: number; length: number };
  reason?: string;
};

/** Validate the stored passage against the exact artifact currently being read. */
export function citationQuality(content: string, start: number, end: number, quote: string): CitationQuality {
  const points = Array.from(content);
  const range = {
    start: Number.isInteger(start) && start >= 0 ? start : 0,
    end: Number.isInteger(end) && end >= 0 ? end : 0,
    length: Number.isInteger(start) && Number.isInteger(end) && end >= start ? end - start : 0,
  };
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > points.length) {
    return { status: "mismatch", range, reason: "The stored range is outside this artifact." };
  }
  if (points.slice(start, end).join("") !== quote) {
    return { status: "mismatch", range, reason: "The stored quote does not match the artifact at this range." };
  }
  return { status: "verified", range };
}
