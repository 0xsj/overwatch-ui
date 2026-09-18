import { redirect } from "next/navigation";
import { homeFor } from "../_navigation";
import { loadShell } from "../_shell";

/** The landing, and it depends on who is asking.
 *
 *  A `client` has one room. Sending them to the overview means the first thing
 *  they see after signing in is a screen that answers 404 — which is correct
 *  non-disclosure arriving in the worst possible place. */
export default async function Home() {
  const shell = await loadShell();
  redirect(homeFor(shell.context?.org.role));
}
