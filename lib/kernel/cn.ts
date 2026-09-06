export type ClassValue = string | number | null | false | undefined;

export function cn(...values: ClassValue[]): string {
  let out = "";
  for (const v of values) {
    if (!v && v !== 0) continue;
    out = out ? `${out} ${v}` : String(v);
  }
  return out;
}
