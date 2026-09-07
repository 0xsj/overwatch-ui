import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { VisuallyHidden } from "../visually-hidden";

export type AccessibleIconProps = {
  /** What the icon MEANS, not what it depicts. "Delete", never "wastebasket".
   *  Required, because an icon carrying meaning with no name is the entire gap
   *  this component exists to close. */
  label: string;
  children: ReactNode;
};

export function AccessibleIcon({ label, children }: AccessibleIconProps) {
  const child = Children.only(children);

  return (
    <>
      {isValidElement(child)
        ? cloneElement(child as ReactElement<Record<string, unknown>>, {
            "aria-hidden": "true",
            focusable: "false",
          })
        : child}
      <VisuallyHidden>{label}</VisuallyHidden>
    </>
  );
}
