"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/overlays";
import { SectionLabel } from "@/components/typography";
import { cn } from "@/lib/kernel";
import s from "./record-drawer.module.css";

export type RecordDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The record's own name — a host, an entity, a run id. Mono, because it is
   *  almost always an identifier. */
  title: ReactNode;
  /** Chips beside the title: the kind, and any standing fact about it. */
  badges?: ReactNode;
  /** One line under the title. Rendered as the dialog's description, so a
   *  screen reader gets it after the name. */
  summary?: ReactNode;
  /** Top right, opposite the close button — a timestamp, usually. */
  aside?: ReactNode;
  children: ReactNode;
};

/** The record drawer: an edge sheet over the page, NOT over the top of it.
 *
 *  Non-modal by decision — see doc.ts. Somebody reading a canvas opens a node,
 *  reads it, and clicks the next one; a modal makes that three actions and they
 *  do it forty times. */
export function RecordDrawer({
  open,
  onOpenChange,
  title,
  badges,
  summary,
  aside,
  children,
}: RecordDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent side="right" overlay={false} className={s.drawer}>
        <DialogHeader className={s.head}>
          <DialogTitle className={s.title}>{title}</DialogTitle>
          {badges || aside ? (
            <div className={s.meta}>
              {badges}
              {aside ? <span className={s.aside}>{aside}</span> : null}
            </div>
          ) : null}
          {summary ? <DialogDescription>{summary}</DialogDescription> : null}
        </DialogHeader>
        <div className={s.body}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function RecordSection({
  heading,
  count,
  className,
  children,
}: {
  heading: ReactNode;
  count?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(s.section, className)}>
      <SectionLabel as="h4" className={s.heading}>
        {heading}
        {count !== undefined ? <span className={s.count}>{count}</span> : null}
      </SectionLabel>
      {children}
    </section>
  );
}

/** A key/value list. `<dl>` rather than a table, because a record is pairs and
 *  a table implies rows that can be compared with one another. */
export function RecordFields({ children }: { children: ReactNode }) {
  return <dl className={s.fields}>{children}</dl>;
}

export function RecordField({
  label,
  action,
  children,
}: {
  label: ReactNode;
  /** A link out — "lineage →", "bytes →". Right-aligned, and never the value. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.field}>
      <dt className={s.key}>{label}</dt>
      <dd className={s.value}>
        <span className={s.valueInner}>{children}</span>
        {action ? <span className={s.action}>{action}</span> : null}
      </dd>
    </div>
  );
}
