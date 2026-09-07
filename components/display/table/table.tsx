import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/kernel";
import s from "./table.module.css";

export type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  /** The header stays put while the body scrolls. Needs the wrapper to be the
   *  scroll container, which it is. */
  stickyHead?: boolean;
};

/** Always inside its own scroll container. A table is the one thing that
 *  reliably outgrows its column, and a page that scrolls sideways because of
 *  one is the bug this prevents by construction. */
export function Table({ className, stickyHead = false, ...props }: TableProps) {
  return (
    <div className={s.scroll}>
      <table className={cn(s.table, stickyHead && s.sticky, className)} {...props} />
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn(s.row, className)} {...props} />;
}

export type TableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  /** Right-aligned and tabular. A column of figures that does not line up is a
   *  column you cannot compare down. */
  numeric?: boolean;
};

export function TableHeaderCell({ className, numeric, scope = "col", ...props }: TableHeaderCellProps) {
  return <th scope={scope} className={cn(s.th, numeric && s.numeric, className)} {...props} />;
}

export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean };

export function TableCell({ className, numeric, ...props }: TableCellProps) {
  return <td className={cn(s.td, numeric && s.numeric, className)} {...props} />;
}

/** The table's accessible name. A `<caption>` is announced before the table and
 *  counted in its summary; visually hidden by default because the heading above
 *  it usually says the same thing to a sighted reader. */
export function TableCaption({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn(s.caption, className)} {...props} />;
}
