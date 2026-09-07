import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/typography";
import { AuthShell } from "../_components/auth-shell";
import { ResetForm } from "./reset-form";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Set a new password — Overwatch" };

/** `/reset?token=…`. The other half of the flow whose first half has worked
 *  since 2026-09-07 — the server mails a link here and this route did not
 *  exist. See `/verify` for why the token travels this way. */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Set a new password"
      blurb="Choosing one here ends every session signed in as you, everywhere. That is the point of a reset — if somebody else is in your account, this is what removes them."
      below={
        <Text size="sm" tone="tertiary">
          Remembered it? <Link href="/sign-in" className={s.link}>Sign in</Link>
        </Text>
      }
    >
      <ResetForm token={token ?? ""} />
    </AuthShell>
  );
}
