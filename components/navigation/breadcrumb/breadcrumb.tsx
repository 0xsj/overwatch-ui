import { Slot } from "radix-ui";
import type { AnchorHTMLAttributes, HTMLAttributes, OlHTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import s from "./breadcrumb.module.css";

export function Breadcrumb({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <nav aria-label="Breadcrumb" className={cn(s.breadcrumb, className)} {...props} />;
}

export function BreadcrumbList({ className, ...props }: OlHTMLAttributes<HTMLOListElement>) {
  return <ol className={cn(s.list, className)} {...props} />;
}

export function BreadcrumbItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn(s.item, className)} {...props} />;
}

export function BreadcrumbLink({
  className,
  asChild = false,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "a";
  return <Comp className={cn(s.link, className)} {...props} />;
}

/** The last crumb. A link to where you already are is a link that does nothing,
 *  so this is not one — it is text carrying `aria-current="page"`. */
export function BreadcrumbPage({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span role="link" aria-disabled="true" aria-current="page" className={cn(s.page, className)} {...props} />;
}

export function BreadcrumbSeparator({ className, children, ...props }: HTMLAttributes<HTMLLIElement>) {
  return (
    <li role="presentation" aria-hidden="true" className={cn(s.separator, className)} {...props}>
      {children ?? "/"}
    </li>
  );
}
