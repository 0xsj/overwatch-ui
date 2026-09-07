import type { FragmentKind } from "@/lib/services/entities";

export const KIND_GLYPH: Record<FragmentKind, string> = {
  org: "◆", person: "☻", cert: "▣", host: "▤", ip: "◉", cidr: "▦", asn: "◈",
  email: "✉", key: "⚿", repo: "❰❱", account: "@", whois: "§", document: "▥",
  // `url` joined the vocabulary and `domain` left it on 2026-09-07 — a domain
  // IS a host, so there is no glyph for one and never was a kind.
  url: "⌁",
};
