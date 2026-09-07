import { Portal as PortalPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

export type PortalProps = ComponentPropsWithoutRef<typeof PortalPrimitive.Root>;

export function Portal(props: PortalProps) {
  return <PortalPrimitive.Root {...props} />;
}
