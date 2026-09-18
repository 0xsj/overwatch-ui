import type { Intensity, MappingRole, Tool, ToolInput } from "@/lib/services/tooling";

/** The definitions overwatch ships with — and **only** the definitions.
 *
 *  This is not a package manager and it is not an integration list. §Scope puts
 *  *"reimplementing scanners"* out of scope in as many words, and vendoring a
 *  binary inherits its bugs and its release cadence; what is shipped here is a
 *  name, an argv, what flows in and out, and how loud it is — which is exactly
 *  what `/tools/add` asks somebody to type. Installing one POSTs the same body
 *  that form posts. **It is a pre-filled form, not a new capability.**
 *
 *  It lives beside the screens rather than in `lib/services` on purpose: there
 *  is no catalogue endpoint and this is not a wire shape. It is screen data.
 *
 *  Deploying the binaries themselves is an image that has them on PATH — infra,
 *  not vendoring, and it puts nothing in a git repository. */
export type CatalogueEntry = ToolInput & {
  /** What it is for, in the words a practitioner would use. */
  note: string;
  /** Whether the FLAGS were checked against the real program, on a machine that
   *  had it, rather than written from memory. An unverified argv is a plausible
   *  guess, and a plausible guess that runs is worse than one that does not —
   *  so the card says which it is and the person reads it before it runs. */
  verified: boolean;

  /** The field mapping, shipped with the definition.
   *
   *  **A tool with no live mapping extracts nothing, for ever, and says so
   *  nowhere.** That is a true and ordinary state — nobody has taught the
   *  system to read that tool yet — and it is also exactly what a person who
   *  just pressed Install has no way to know they are in. Installing subfinder
   *  and watching a run finish green with an empty Assets screen was the whole
   *  of the 2026-09-08 report, and this field is the fix.
   *
   *  **Only where the OUTPUT was observed.** The `verified` flag above is about
   *  the flags; this is the same claim about the shape of what comes back, and
   *  it is a stronger one — a wrong path reads nothing, and a path that reads
   *  the wrong key writes observations that are lies with lineage attached.
   *  Where nobody has run the program, this is ABSENT rather than guessed, and
   *  the way to fill it in is to install the tool, run it once and read the
   *  paths off Extraction quality. That screen exists for exactly this. */
  mappings?: readonly CatalogueMapping[];
};

/** One shipped mapping — the same three fields `/tools/{id}/mappings` takes. */
export type CatalogueMapping = {
  /** What the value MEANS, which is the mapping author's word and never the
   *  source's own key. `.source` becomes `provider`, `.input` becomes
   *  `queried` — naming a field from the key it was read out of is the
   *  observation/fact error one level down. */
  field: string;
  /** A dotted path, and `.line` for a text artifact — the whole of that line. */
  expression: string;
  role: MappingRole;
};

/* Flags marked `verified` were read out of the program's own `-h` on
   2026-09-07: subfinder's `-oJ`/`-silent`/`-d`, nuclei's `-jsonl`/`-u`, and
   `dig +short`, which was also run. The rest are the shapes these tools take
   and are NOT confirmed here, because the binaries are not on this machine. */
export const CATALOGUE: readonly CatalogueEntry[] = [
  {
    name: "subfinder",
    argv: "subfinder -oJ -silent -d {{host}}",
    produces: "host",
    intensity: "passive",
    note: "Passive subdomain discovery. The usual SOURCE of a chain — it consumes nothing and is seeded from the target.",
    verified: true,
    /* Read off `subfinder -oJ -d hackerone.com` on 2026-09-08:
       {"host":"api.hackerone.com","input":"hackerone.com","source":"thc"}
       Three keys, and all three are mapped. `.input` is the name subfinder was
       ASKED about, which would be a `derived_from` on any tool that consumed
       something — `0040` refuses that role on a source, and it is an honest
       attribute rather than a mis-roled edge. */
    mappings: [
      { field: "host", expression: ".host", role: "subject" },
      { field: "provider", expression: ".source", role: "attribute" },
      { field: "queried", expression: ".input", role: "attribute" },
    ],
  },
  {
    name: "dig",
    argv: "dig +short {{host}}",
    produces: "ip",
    intensity: "passive",
    note: "One resolution, and it answers in milliseconds. The cheapest source there is, and the one to install first if you want to see a run finish. It prints one address per line, which is read as a line-oriented artifact.",
    verified: true,
    /* `dig +short www.example.com` on 2026-09-08: one address per line and
       nothing else. No `-json` flag, so the artifact is `text/plain` and each
       line is a record whose only value is at `.line`. */
    mappings: [{ field: "ip", expression: ".line", role: "subject" }],
  },
  {
    name: "whois",
    argv: "whois {{host}}",
    consumes: "host",
    produces: "whois",
    intensity: "passive",
    note: "Registration records. Not usable as a source: `whois` is a claim-gated kind, and nothing is ever spawned against one — so a scope rule cannot permit it at the top of a chain.",
    verified: true,
    /* NO MAPPING, deliberately. `whois` prints a multi-line DOCUMENT, not one
       value per line, so reading it as a line-oriented artifact would mint a
       fragment for every line of boilerplate in the registrar's footer. It
       needs a parser this system does not have, and pretending otherwise with
       `.line` would fill the graph with rubbish that carries lineage. */
  },
  {
    name: "httpx",
    argv: "httpx -json -silent -tech-detect -u {{host}}",
    consumes: "host",
    produces: "url",
    intensity: "light",
    note: "What answers over HTTP, and what it says it is running. Ordinary requests at recon volume — a crawler looks the same, which is why this is light rather than loud.",
    verified: false,
  },
  {
    name: "dnsx",
    argv: "dnsx -json -a -resp -silent -l -",
    consumes: "host",
    produces: "ip",
    intensity: "light",
    note: "Resolution in bulk. Reads its list on stdin, which nothing feeds yet — every non-source step is skipped today.",
    verified: false,
  },
  {
    name: "tlsx",
    argv: "tlsx -json -san -u {{host}}",
    consumes: "host",
    produces: "cert",
    intensity: "passive",
    note: "What certificate is presented and what names it claims. The names on a certificate are one of the strongest attribution signals there is.",
    verified: false,
  },
  {
    name: "naabu",
    argv: "naabu -json -top-ports 100 -host {{host}}",
    consumes: "host",
    produces: "url",
    intensity: "light",
    note: "A port sweep of the common hundred. Light rather than loud because it connects and nothing more.",
    verified: false,
  },
  {
    name: "asnmap",
    argv: "asnmap -json -d {{host}}",
    consumes: "host",
    produces: "asn",
    intensity: "passive",
    note: "The autonomous system behind an address — the step that turns one host into a range worth looking at.",
    verified: false,
  },
  {
    name: "nuclei",
    argv: "nuclei -jsonl -silent -severity medium,high,critical -u {{url}}",
    consumes: "url",
    produces: "finding",
    intensity: "loud",
    /* Two exit codes, and this is the entry `decisions/0033` was written for:
       nuclei exits 1 when it finds NOTHING, so grading strictly turns the
       commonest good answer into a failed run. */
    success_exit_codes: [0, 1],
    note: "Template-driven probing. It SENDS PAYLOADS, so any check containing it needs admin on the engagement, and a scope rule that admits passive collection will still refuse it.",
    verified: true,
    /* Read off a real `nuclei -jsonl` line on 2026-09-08, against a throwaway
       HTTP server on this machine rather than anything outward-facing.
       `signature` and `severity` are what make a FINDING — `0041`:
       `template-id` is what nuclei calls this class of problem, and it is the
       half of the identity that makes tomorrow's rescan a sighting rather than
       a second row.
       The SUBJECT is a url and not a finding: a finding-producing tool's
       subject kind is its CONSUMES. `.matched-at` is the exact url that
       matched, which is narrower and truer than the `.url` it was handed.
       `.request`, `.response`, `.curl-command` and `.template-encoded` are
       deliberately LEFT ALONE. They are the evidence, they are already in the
       artifact verbatim, and lifting a 3KB response body into an observation
       would put it in that asset's field list. */
    mappings: [
      { field: "url", expression: ".matched-at", role: "subject" },
      { field: "template", expression: ".template-id", role: "signature" },
      { field: "severity", expression: ".info.severity", role: "severity" },
      { field: "title", expression: ".info.name", role: "attribute" },
    ],
  },
];

/** Where a definition came from, DERIVED rather than stored.
 *
 *  There is no provenance column on the wire and this does not need one: a tool
 *  whose name and argv still match the catalogue IS the shipped definition, and
 *  the moment somebody edits the argv it is theirs. That is not an
 *  approximation of the truth, it is the truth — a changed command is a
 *  different command, whatever it was called when it arrived. */
export type Provenance = "bundled" | "authored";

export function provenanceOf(tool: Pick<Tool, "name" | "argv">): Provenance {
  return CATALOGUE.some((c) => c.name === tool.name && c.argv === tool.argv)
    ? "bundled"
    : "authored";
}

export function entryFor(tool: Pick<Tool, "name">): CatalogueEntry | undefined {
  return CATALOGUE.find((c) => c.name === tool.name);
}

export const INTENSITY_MEANING: Record<Intensity, string> = {
  passive: "touches the providers, never the target",
  light: "ordinary requests at recon volume — not distinguishable from a crawler",
  loud: "sends payloads, so the run gate is raised to admin on this engagement",
};
