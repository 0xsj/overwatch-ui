import { Slot } from "radix-ui";
import { LoaderCircle } from "@/components/utility";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import s from "./button.module.css";
import { buttonVariants, type ButtonVariants } from "./button.variants";

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> &
  ButtonVariants & {
    asChild?: boolean;
    loading?: boolean;
  };

export type ButtonProps =
  | (BaseProps & { size?: Exclude<ButtonVariants["size"], "icon"> })
  | (BaseProps & { size: "icon"; "aria-label": string });

export function Button({
  asChild = false,
  className,
  intent,
  size,
  loading = false,
  disabled = false,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const inert = disabled || loading;

  return (
    <Comp
      {...(asChild
        ? { "aria-disabled": inert || undefined, tabIndex: inert ? -1 : undefined }
        : { disabled: inert, type })}
      data-disabled={inert || undefined}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ intent, size }), className)}
      {...props}
    >
      {loading ? <LoaderCircle className={s.spinner} aria-hidden="true" /> : null}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );
}
