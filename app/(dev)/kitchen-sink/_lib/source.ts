import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "components";

export type Source = { path: string; code: string };

export async function readSources(rels: readonly string[]): Promise<Source[]> {
  return Promise.all(
    rels.map(async (rel) => ({
      path: `${ROOT}/${rel}`,
      code: (await readFile(path.join(process.cwd(), ROOT, rel), "utf8")).trimEnd(),
    })),
  );
}
