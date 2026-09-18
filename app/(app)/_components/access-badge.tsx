import { Badge } from "@/components/display";
import { GRANT_MEANING, type GrantLevel } from "@/lib/services/tenancy";

/** `none` has no badge, and that is the rule rather than an omission.
 *
 *  A workspace the caller has no access to is ABSENT — not a disabled row, not
 *  a greyed chip, not a 403. Rendering it tells an analyst that a client they
 *  cannot see exists, and for the client behind that wall that is the leak
 *  itself. So this component cannot draw `none`, which means no screen can
 *  reach for it by accident. */
const TONE = { read: "neutral", write: "info", admin: "warn" } as const;

const RESEARCH_MEANING = { read: "Read sources, cited observations, and working notes", write: "Add sources and observations; write and edit your notes", admin: "Manage this investigation and access; add sources, observations, and notes" };

export function AccessBadge({ level, research = false }: { level: GrantLevel; research?: boolean }) {
  if (level === "none") return null;
  return (
    <Badge tone={TONE[level]} mono title={research ? RESEARCH_MEANING[level] : GRANT_MEANING[level]}>
      {level}
    </Badge>
  );
}
