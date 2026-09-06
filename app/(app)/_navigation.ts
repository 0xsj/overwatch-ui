import {
  Activity,
  ChartColumn,
  House,
  Settings,
  Table2,
  Waypoints,
  Wrench,
  type LucideIcon,
} from "lucide-react";

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
    sub: "A definition and a mapping. Never an integration.",
    Icon: Wrench,
    pages: [
      { href: "/tools/installed", label: "Installed" },
      { href: "/tools/add", label: "Add a tool" },
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
      { href: "/settings/target-access", label: "Target access" },
      { href: "/settings/audit-log", label: "Audit log" },
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
