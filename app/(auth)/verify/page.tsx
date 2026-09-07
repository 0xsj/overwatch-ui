import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@/components/typography";
import { AuthShell } from "../_components/auth-shell";
import { VerifyForm } from "./verify-form";
import s from "../_components/auth.module.css";

export const metadata: Metadata = { title: "Confirm your address — Overwatch" };

/** `/verify?token=…`, and the query parameter is the whole design.
 *
 *  The emailed link has nowhere else to put the token, but it points at the
 *  CLIENT rather than at the server: this screen reads it out of its own URL and
 *  POSTs it in a body. A token in a server URL is written into every access log
 *  it passes and leaks onward in a `Referer` header, and neither is under that
 *  server's control.
 *
 *  The server has been mailing links here since 2026-09-07 and this route did
 *  not exist, so every one of them arrived at a 404. */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Confirm your address"
      blurb="One click, and the address on your account is proven. Until it is, you can sign in and look around but not start an engagement."
      below={
        <Text size="sm" tone="tertiary">
          Link expired? <Link href="/check-email" className={s.link}>Send another</Link>
        </Text>
      }
    >
      <VerifyForm token={token ?? ""} />
    </AuthShell>
  );
}
