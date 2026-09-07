"use client";

import { useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/kernel";
import s from "./sink.module.css";

type Entry = { section: string; sectionId: string; cases: { id: string; title: string }[] };

/** The DOM is the store, so it is READ rather than mirrored into state.
 *
 *  The nav is derived from the rendered page and not declared beside it. The
 *  registry already gives sections that property — a section cannot exist and be
 *  unreachable — and a second hand-kept list of thirty-eight cases would have
 *  exactly the drift the registry was built to avoid.
 *
 *  `getSnapshot` returns a stable STRING, not an array: a new array every call is
 *  a new identity every call, which is an infinite render loop. The entries are
 *  derived from that key with `useMemo`. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function getSnapshot(): string {
  return [...document.querySelectorAll("[data-section], [data-case]")]
    .map((e) => e.id)
    .join(",");
}

const getServerSnapshot = () => "";

function scan(): Entry[] {
  return [...document.querySelectorAll<HTMLElement>("[data-section]")].map((section) => ({
    section: section.dataset.section ?? "",
    sectionId: section.id,
    cases: [...section.querySelectorAll<HTMLElement>("[data-case]")].map((c) => ({
      id: c.id,
      title: c.dataset.case ?? "",
    })),
  }));
}

function useActiveCase(key: string): string | null {
  const active = useSyncExternalStore(
    (onChange) => {
      const targets = document.querySelectorAll<HTMLElement>("[data-case]");
      if (!targets.length) return () => {};
      // rootMargin pins the band near the top, so the active entry is what you
      // are reading rather than whatever happens to be centred.
      const observer = new IntersectionObserver(
        (records) => {
          const seen = records.find((r) => r.isIntersecting);
          if (seen) {
            current = seen.target.id;
            onChange();
          }
        },
        { rootMargin: "-72px 0px -70% 0px", threshold: 0 },
      );
      for (const t of targets) observer.observe(t);
      return () => observer.disconnect();
    },
    () => current,
    () => null,
  );
  void key;
  return active;
}

let current: string | null = null;

export function CaseNav() {
  const key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const entries = useMemo(() => (key ? scan() : []), [key]);
  const active = useActiveCase(key);

  return (
    <nav className={s.caseNav} aria-label="Components on this page">
      {entries.map((entry) => (
        <div key={entry.sectionId} className={s.caseGroup}>
          <a href={`#${entry.sectionId}`} className={s.caseSection}>{entry.section}</a>
          {entry.cases.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className={cn(s.caseLink, active === c.id && s.caseLinkActive)}
              aria-current={active === c.id ? "true" : undefined}
            >
              {c.title}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
