import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | Overwatch",
  description: "Your Overwatch workspace.",
};

/** Keep the legacy landing alias on the canonical investigation entrypoint.
 *
 *  That entrypoint owns the role-specific client handoff, so this alias does
 *  not need to load the authenticated shell and redirect a second time. */
export default function Page() {
  redirect("/investigation");
}
