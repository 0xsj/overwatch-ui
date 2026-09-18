export type TextDiffKind = "same" | "added" | "removed";
export type TextDiffLine = { kind: TextDiffKind; text: string };
export type TextDiff = { lines: TextDiffLine[]; truncated: boolean };

const MAX_LINES = 1500;

/**
 * Produces a deterministic line diff for two retained text captures. The
 * bound keeps a large HTML page from turning a browser render into an
 * unbounded quadratic operation; the captures themselves remain untouched and
 * can still be opened normally.
 */
export function diffText(earlier: string, later: string): TextDiff {
  const left = earlier.split("\n");
  const right = later.split("\n");
  if (left.length > MAX_LINES || right.length > MAX_LINES) return { lines: [], truncated: true };

  const width = right.length + 1;
  const table = Array.from({ length: left.length + 1 }, () => new Uint16Array(width));
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const lines: TextDiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      lines.push({ kind: "same", text: left[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ kind: "removed", text: left[i++] });
    } else {
      lines.push({ kind: "added", text: right[j++] });
    }
  }
  while (i < left.length) lines.push({ kind: "removed", text: left[i++] });
  while (j < right.length) lines.push({ kind: "added", text: right[j++] });
  return { lines, truncated: false };
}
