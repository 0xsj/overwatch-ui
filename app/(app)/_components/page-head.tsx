import type { ReactNode } from "react";
import { Mock } from "@/components/display";
import { Heading, Text } from "@/components/typography";
import s from "./page-head.module.css";

export function PageHead({
  title,
  children,
  actions,
  mock = false,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** This screen's data comes from a fixture. Declared by the screen and gated
   *  on nothing: an endpoint that is still a proposal stays mock after a backend
   *  exists, and only the screen knows which of those it is. */
  mock?: boolean;
}) {
  return (
    <header className={s.head}>
      <div className={s.titles}>
        <div className={s.titleRow}>
          <Heading level={1} scale="h1">{title}</Heading>
          {mock ? <Mock /> : null}
        </div>
        {children ? (
          <Text size="sm" tone="tertiary" measure className={s.sub}>{children}</Text>
        ) : null}
      </div>
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </header>
  );
}
