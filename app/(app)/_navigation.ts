import {
  Activity,
  ChartColumn,
  House,
  Settings,
  Table2,
  Waypoints,
  Wrench,
  type LucideIcon,
} from "@/components/utility";

export type NavPage = { href: string; label: string };

export type NavSection = {
  id: string;
  label: string;
  sub: string;
  Icon: LucideIcon;
  pages: NavPage[];
  /** Reachable by a `client` — and `false` is the default, deliberately.
   *
   *  `decisions/0042` made the role remove ROUTES rather than lower a level:
   *  every workspace route answers 404 to a client except the report ones,
   *  and 404 rather than 403 because a client learning that an invocation log
   *  exists is a client learning what was run against them.
   *
   *  The gate is FAIL-CLOSED on the server — a route added tomorrow excludes
   *  clients without anybody remembering to think about it — and this list
   *  mirrors that: a section added here is hidden from a client until somebody
   *  says otherwise. Offering a link that answers 404 is the one thing a nav
   *  must not do, because to the reader it is indistinguishable from a fault. */
  client?: true;
};

export const SECTIONS: NavSection[] = [
  {
    id: "investigation",
    label: "Research",
    sub: "Sources, observations, and working questions.",
    Icon: House,
    pages: [
      { href: "/investigation/overview", label: "Overview" },
      { href: "/investigation/sources", label: "Sources" },
      { href: "/investigation/evidence", label: "Evidence review" },
      { href: "/investigation/questions", label: "Open questions" },
      { href: "/investigation/timeline", label: "Timeline" },
      { href: "/investigation/notes", label: "Working notes" },
      { href: "/investigation", label: "All investigations" },
    ],
  },
  {
    id: "home",
    label: "Home",
    sub: "This engagement at a glance.",
    Icon: House,
    pages: [
      { href: "/home/overview", label: "Overview" },
      { href: "/home/targets", label: "Targets" },
      { href: "/home/whats-new", label: "What's new" },
      { href: "/home/alerts", label: "Source alerts" },
      // An engagement-level screen, moved out of org settings 2026-09-07. An
      // audit entry carries no org id, so an org-wide feed would list rows about
      // engagements the reader may not be on — the wall 0005 exists to keep.
      { href: "/home/audit-log", label: "Audit log" },
    ],
  },
  {
    id: "surface",
    label: "Surface",
    sub: "Assets, why they are ours, and what has been checked.",
    Icon: Table2,
    pages: [
      { href: "/surface/assets", label: "Assets" },
      { href: "/surface/attributions", label: "Attributions" },
      { href: "/surface/coverage", label: "Coverage" },
      { href: "/surface/scope", label: "Scope" },
      { href: "/surface/lineage", label: "Lineage" },
    ],
  },
  {
    id: "entities",
    label: "Entities",
    sub: "Identity across sources and time.",
    Icon: Waypoints,
    pages: [
      { href: "/entities/canvas", label: "Canvas" },
      { href: "/entities/all", label: "All entities" },
      { href: "/entities/across-targets", label: "Across targets" },
    ],
  },
  {
    id: "findings",
    label: "Findings",
    sub: "Claims that something is wrong, with a lifecycle.",
    Icon: ChartColumn,
    /* Findings is a client's deliverable door. Research board access is not
       behind it; recipient handoffs and issued reports are the two explicit
       safe projections. */
    client: true,
    pages: [
      { href: "/findings/board", label: "Board" },
      { href: "/findings/report", label: "Report" },
      { href: "/findings/handoffs", label: "Recipient handoffs" },
    ],
  },
  {
    id: "observability",
    label: "Observability",
    sub: "What ran, what refused, and whether the machinery is well.",
    Icon: Activity,
    pages: [
      { href: "/observability/logs", label: "Logs" },
      { href: "/observability/runs", label: "Runs" },
      { href: "/observability/health", label: "Health" },
      { href: "/observability/extraction-quality", label: "Extraction quality" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    sub: "Definitions and mappings, and the questions they answer.",
    Icon: Wrench,
    pages: [
      { href: "/tools/installed", label: "Installed" },
      { href: "/tools/add", label: "Add a tool" },
      // A check is not a tool, and it lives here because this is the section
      // for machinery a person configures. Runs of it are observability's.
      { href: "/tools/checks", label: "Checks" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    sub: "The organisation, and who may see what.",
    Icon: Settings,
    pages: [
      { href: "/settings/organisation", label: "Organisation" },
      { href: "/settings/members", label: "Members" },
      { href: "/settings/workspaces", label: "Investigations" },
      // "Access", not "Target access". A grant is member x WORKSPACE — the wall
      // a consultancy buys is per engagement, not per target, and a target does
      // not close one at a time. Renamed 2026-09-07 with the noun.
      { href: "/settings/access", label: "Access" },
      // The FIRM's log — membership, roles, invitations. Narrower than the
      // screen that used to be here: an org-scope entry can never name a
      // workspace, which is the only reason it is safe to show every member.
      { href: "/settings/audit-log", label: "Organisation log" },
    ],
  },
];

export const HOME = "/investigation";

export function navHref(href: string, workspace?: string): string {
  const match = /^\/investigation\/(overview|sources|evidence|questions|timeline|notes)$/.exec(href);
  return match ? (workspace ? `/investigation/${encodeURIComponent(workspace)}/${match[1]}` : HOME) : href;
}

/** Where a role LANDS, which is not always the first section.
 *
 *  A `client` sent to `/home/overview` arrives at a screen that answers 404 for
 *  them — the first thing they see after signing in is a wall. Their door is
 *  the deliverables section. */
export function homeFor(role: string | undefined): string {
  return role === "client" ? "/findings/report" : HOME;
}

/** The first path segment IS the section id, which is why the routes are nested
 *  under one. Nothing scans a table to find out where it is. */
export function sectionFor(pathname: string): NavSection {
  const id = pathname.split("/")[1] ?? "";
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}

/** The navigation a role can actually reach.
 *
 *  A `client` sees deliverable projections and nothing else. Everything else 404s for them,
 *  and a link that answers 404 is worse than a missing link: to the reader it
 *  is indistinguishable from a broken product, and the 404 is deliberate
 *  non-disclosure rather than a fault.
 *
 *  Every other role is unchanged — this returns the whole list. */
export function sectionsFor(role: string | undefined): NavSection[] {
  if (role !== "client") return SECTIONS;
  return SECTIONS.filter((s) => s.client).map((s) => ({
    ...s,
    pages: s.pages.filter((p) => p.href.startsWith("/findings/report") || p.href.startsWith("/findings/handoffs")),
  }));
}
