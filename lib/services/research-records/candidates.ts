import type { Evidence } from "@/lib/services/review";
import type { ResearchRecordKind } from "./index";

export type ResearchRecordCandidate = {
  kind: ResearchRecordKind;
  name: string;
  observation_ids: string[];
  rationale: string;
};

const handlePattern = /@[a-z0-9][a-z0-9_.-]{1,63}/gi;
const emailPattern = /\b[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]{0,63}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b/gi;

// This is intentionally a narrow, local candidate pass. It recognizes exact
// identifier-shaped strings but does not guess names, identity, ownership, or
// relationship semantics. Every candidate keeps the observations that exposed
// the identifier so the normal research-record review path can verify it.
export function researchRecordCandidates(rows: Evidence[]): ResearchRecordCandidate[] {
  const found = new Map<string, ResearchRecordCandidate>();
  for (const row of rows) {
    const text = `${row.statement}\n${row.quote}`;
    const emails = [...text.matchAll(emailPattern)];
    for (const email of emails) addCandidate(email[0], row, found);
    for (const handle of text.matchAll(handlePattern)) {
      const index = handle.index ?? -1;
      if (emails.some((email) => {
        const start = email.index ?? -1;
        return index >= start && index < start + email[0].length;
      })) continue;
      addCandidate(handle[0], row, found);
    }
  }
  return [...found.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function addCandidate(name: string, row: Evidence, found: Map<string, ResearchRecordCandidate>) {
  const clean = name.trim();
  const key = clean.toLocaleLowerCase();
  const existing = found.get(key);
  if (existing) {
    if (!existing.observation_ids.includes(row.observation_id)) existing.observation_ids.push(row.observation_id);
    return;
  }
  found.set(key, {
    kind: "account",
    name: clean,
    observation_ids: [row.observation_id],
    rationale: "Exact account-shaped identifier surfaced in selected retained observations; verify what the identifier refers to before saving.",
  });
}

export function synthesisText(rows: Evidence[]): string {
  return rows.map((row) => `${row.source_title}: ${row.statement}`).join("\n");
}
