/** Return case-insensitive match starts as Unicode code-point offsets. */
export function textOccurrences(content: string, query: string): number[] {
  const needle = Array.from(query.trim().toLocaleLowerCase());
  if (!needle.length) return [];
  const points = Array.from(content);
  const folded: string[] = [];
  const origins: number[] = [];
  points.forEach((point, index) => {
    for (const foldedPoint of Array.from(point.toLocaleLowerCase())) {
      folded.push(foldedPoint);
      origins.push(index);
    }
  });
  const starts: number[] = [];
  for (let start = 0; start <= folded.length - needle.length; start += 1) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (folded[start + offset] !== needle[offset]) {
        matches = false;
        break;
      }
    }
    if (matches && (start === 0 || origins[start] !== origins[start - 1])) starts.push(origins[start]);
  }
  return starts;
}
