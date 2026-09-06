import type { ReactNode } from "react";
import { Heading, Text } from "@/components/typography";
import s from "./sink.module.css";

export function Section({ id, title, blurb, children }: {
  id: string; title: string; blurb?: string; children: ReactNode;
}) {
  return (
    <section id={id} className={s.section}>
      <Heading level={2} scale="h1">{title}</Heading>
      {blurb ? <Text tone="tertiary" size="sm" measure>{blurb}</Text> : null}
      <div className={s.sectionBody}>{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.row}>
      <Text as="span" size="xs" tone="quiet" className={s.rowLabel}>{label}</Text>
      {children}
    </div>
  );
}

export function Panel({ title, note, children, sources }: {
  title: string; note?: string; children: ReactNode;
  sources?: ReadonlyArray<{ path: string; code: string }>;
}) {
  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <Heading level={3} scale="h3">{title}</Heading>
        {note ? <Text as="span" size="xs" tone="tertiary">{note}</Text> : null}
      </div>
      <div className={s.panelBody}>{children}</div>
      {sources?.map((src) => (
        <div key={src.path}>
          <p className={s.codePath}>{src.path}</p>
          <pre className={s.code}><code>{src.code}</code></pre>
        </div>
      ))}
    </div>
  );
}
