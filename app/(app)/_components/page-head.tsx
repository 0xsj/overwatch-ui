import type { ReactNode } from "react";
import { Heading, Text } from "@/components/typography";
import s from "./page-head.module.css";

export function PageHead({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={s.head}>
      <div className={s.titles}>
        <Heading level={1} scale="h1">{title}</Heading>
        {children ? (
          <Text size="sm" tone="tertiary" measure className={s.sub}>{children}</Text>
        ) : null}
      </div>
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </header>
  );
}
