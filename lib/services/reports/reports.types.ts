/** A report is a CONFIGURATION; issuing it freezes bytes — `decisions/0042`. */
export type Report = {
  report_id: string;
  workspace_id: string;
  target_id: string;
  title: string;
  prepared_by?: string;
  period_start?: string;
  period_end?: string;
  /** **ALWAYS the full seven**, with `enabled` on each — never only the enabled
   *  ones. A screen has to draw the toggles that are OFF, and the two that ship
   *  off are the ones it most needs to draw. */
  sections: Section[];
  revisions: number;
  created_at: string;
};

export type Section = {
  key: string;
  title: string;
  enabled: boolean;
  /** The position IN THE ENABLED SET, absent when disabled — disable the second
   *  section and 3–7 become 2–6. A stored number would be wrong the moment a
   *  toggle moved. */
  number?: number;
  /** The one section that cannot be turned off. **Do not draw an enabled toggle
   *  for it** — turning it off is a 400 whose message is the thesis. */
  mandatory: boolean;
  /** What turning this off COSTS, and it is **server-side copy**: an argument
   *  about the record rather than a label. Render it VERBATIM — a copy of that
   *  sentence in this repository would drift from the one in theirs. */
  warning?: string;
  /** Marks the two sections carrying a capability a `client` is not given —
   *  §Scope's *"generate a report vs receive its artifacts"*. Two toggles and
   *  not one, because they are two capabilities. */
  withheld: boolean;
};

export type ReportInput = {
  target_id: string;
  title: string;
  prepared_by?: string;
  period_start?: string;
  period_end?: string;
};

/** The frozen bytes. **JSON, not a PDF** — a page is a rendering property and
 *  this server does not render pages, so the mock's `2p` counts do not exist.
 *  Every count that can be honestly given is on each section instead. */
export type Revision = {
  revision_id: string;
  report_id: string;
  issued_at: string;
  issued_by?: string;
  /** Names what the document LEFT OUT. A disabled section is ABSENT from the
   *  frozen document rather than present and empty — an empty section reads as
   *  *"we looked and there was nothing"*. */
  withheld: string[];
  sections: { key: string; title: string; number: number; body: unknown }[];
};
