import { readFile } from "node:fs/promises";
import path from "node:path";

export type Theme = "dark" | "light";
export type Check = {
  fg: string;
  bg: string;
  ratio: number;
  large: boolean;
  pass: boolean;
};

const ROOT = process.cwd();
const HEX = /^#([0-9a-f]{6})$/i;

function block(css: string, selector: RegExp): string {
  const m = selector.exec(css);
  if (!m) return "";
  const from = css.indexOf("{", m.index) + 1;
  return css.slice(from, css.indexOf("}", from));
}

function declarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of body.split(";")) {
    const [name, ...rest] = line.split(":");
    if (!name?.trim().startsWith("--")) continue;
    out.set(name.trim(), rest.join(":").trim());
  }
  return out;
}

function resolve(name: string, semantic: Map<string, string>, palette: Map<string, string>): string | null {
  const seen = new Set<string>();
  let value = semantic.get(name) ?? palette.get(name) ?? null;
  while (value && value.startsWith("var(")) {
    const ref = value.slice(4, value.indexOf(")")).trim();
    if (seen.has(ref)) return null;
    seen.add(ref);
    value = semantic.get(ref) ?? palette.get(ref) ?? null;
  }
  return value && HEX.test(value) ? value : null;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const chan = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Foreground / background pairs the design actually promises, and whether the
 *  text at that pair is large (3:1) or normal (4.5:1). */
const PAIRS: ReadonlyArray<[string, string, boolean]> = [
  ["--ink", "--surface-ground", false],
  ["--ink-2", "--surface-ground", false],
  ["--ink-3", "--surface-ground", false],
  ["--ink-4", "--surface-ground", false],
  ["--ink", "--surface-panel", false],
  ["--ink-2", "--surface-panel", false],
  ["--ink-3", "--surface-panel", false],
  ["--ink-4", "--surface-panel", false],
  ["--accent", "--surface-panel", false],
  ["--warn", "--surface-panel", false],
  ["--crit", "--surface-panel", false],
  ["--info", "--surface-panel", false],
  ["--fill-ink", "--fill", false],
];

export async function audit(): Promise<Record<Theme, Check[]>> {
  const [primitives, semantic] = await Promise.all([
    readFile(path.join(ROOT, "styles/tokens/primitives.css"), "utf8"),
    readFile(path.join(ROOT, "styles/tokens/semantic.css"), "utf8"),
  ]);

  const palette = declarations(block(primitives, /:root\s*\{/));
  const themes: Record<Theme, Map<string, string>> = {
    dark: declarations(block(semantic, /:root\s*\{/)),
    light: declarations(block(semantic, /:root\[data-theme="light"\]\s*\{/)),
  };

  const out = {} as Record<Theme, Check[]>;
  for (const theme of ["dark", "light"] as const) {
    out[theme] = PAIRS.map(([fg, bg, large]) => {
      const a = resolve(fg, themes[theme], palette);
      const b = resolve(bg, themes[theme], palette);
      const ratio = a && b ? contrast(a, b) : 0;
      return { fg, bg, ratio, large, pass: ratio >= (large ? 3 : 4.5) };
    });
  }
  return out;
}
