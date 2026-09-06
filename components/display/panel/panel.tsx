import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./panel.module.css";

/** `title` is omitted from the HTML attributes deliberately: the DOM's `title`
 *  is a tooltip string, and this one is a heading that takes markup. Leaving
 *  both in place makes the type an intersection that only accepts a string. */
export type PanelProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  /** Content sits flush against the border. For a table or a canvas, which
   *  bring their own edges. */
  bleed?: boolean;
};

export function Panel({ title, note, actions, bleed, className, children, ...props }: PanelProps) {
  return (
    <section className={cn(s.panel, className)} {...props}>
      {title || actions ? (
        <header className={s.head}>
          <h3 className={s.title}>{title}</h3>
          {note ? <span className={s.note}>{note}</span> : null}
          {actions ? <div className={s.actions}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={bleed ? s.bleed : s.body}>{children}</div>
    </section>
  );
}
