import type { FragmentKind } from "@/lib/services/entities";

export const KIND_GLYPH: Record<FragmentKind, string> = {
  org: "◆", person: "☻", cert: "▣", host: "▤", ip: "◉", cidr: "▦", asn: "◈",
  email: "✉", key: "⚿", repo: "❰❱", account: "@", whois: "§", document: "▤",
};
