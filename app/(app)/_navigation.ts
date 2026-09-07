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
};

export const SECTIONS: NavSection[] = [
  {
    id: "home",
    label: "Home",
    sub: "This engagement at a glance.",
    Icon: House,
    pages: [
      { href: "/home/overview", label: "Overview" },
      { href: "/home/targets", label: "Targets" },
      { href: "/home/whats-new", label: "What's new" },
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
    pages: [
      { href: "/findings/board", label: "Board" },
      { href: "/findings/report", label: "Report" },
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
      { href: "/settings/workspaces", label: "Engagements" },
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

export const HOME = SECTIONS[0].pages[0].href;

/** The first path segment IS the section id, which is why the routes are nested
 *  under one. Nothing scans a table to find out where it is. */
export function sectionFor(pathname: string): NavSection {
  const id = pathname.split("/")[1] ?? "";
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}
