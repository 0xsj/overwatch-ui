import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/typography";
import { AuthShell } from "../_components/auth-shell";
import { EmailChangeForm } from "./email-change-form";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Confirm your new address — Overwatch" };

/** `/email?token=…` — the third of the three link routes, beside `/verify` and
 *  `/reset`. Same reasoning: the emailed link points at the CLIENT, this screen
 *  reads the token out of its own URL and POSTs it in a body, so it is never
 *  written into a server access log or leaked in a `Referer`.
 *
 *  This is the one whose link goes to an address that is not yet the account's,
 *  which is the whole point of the flow: nothing moves until somebody proves
 *  they can read mail at the new one. */
export default async function EmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Confirm your new address"
      blurb="Somebody asked to move an Overwatch account to this address. Until this link is used, nothing has changed."
      below={
        <Text size="sm" tone="tertiary">
          Not expecting this? Ignore it — <Link href="/sign-in" className={s.link}>sign in</Link>{" "}
          and change your password instead.
        </Text>
      }
    >
      <EmailChangeForm token={token ?? ""} />
    </AuthShell>
  );
}
