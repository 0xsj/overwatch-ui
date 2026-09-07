import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { loadShell } from "../_shell";
import { PageHead } from "../_components/page-head";
import { AcceptForm } from "./accept-form";
import s from "./invite.module.css";

export const metadata: Metadata = { title: "You have been invited — Overwatch" };

/** Under `(app)` and not `(auth)`, which is the whole shape of this route.
 *
 *  Accepting requires a SESSION — `POST /v1/invites/accept` answers 401 without
 *  one. So this screen sits behind the same gate as everything else, and an
 *  unauthenticated visitor is redirected to sign in by `loadShell` exactly as
 *  they would be anywhere. There is deliberately no register-and-accept in one
 *  step: that would put identity's registration and org's membership in one
 *  command, which is the coupling `decisions/0017` deleted.
 *
 *  It cannot say who the invitation is FOR before trying it. There is no read
 *  endpoint — `GET /v1/invites/{token}` is 404 and there is no list — so the
 *  client holds a token and nothing else. `ALIGNMENT.md` asks for a screen that
 *  shows the address and offers to sign out if the session is a different one;
 *  half of that is buildable and this is the half. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const shell = await loadShell();

  return (
    <>
      <PageHead title="You have been invited">
        Accepting adds you to somebody else&rsquo;s organisation. You keep your own —
        after this you will be in two, and the switcher above is how you move
        between them.
      </PageHead>

      <Panel title="Signed in as">
        <Text size="sm" className={s.mono}>{shell.me.email}</Text>
        <Text size="xs" tone="tertiary">
          An invitation is bound to the address it was sent to, so a forwarded link
          is useless. If this one was not sent to you, sign out and sign in as the
          person it was meant for.
        </Text>
      </Panel>

      {token ? (
        <AcceptForm token={token} />
      ) : (
        <Alert tone="crit">
          <Text size="sm">This link carries no token.</Text>
          <Text size="sm" tone="tertiary">
            Open it again from the message, or ask whoever invited you to send
            another. <Link href="/home" className={s.link}>Back to the application</Link>
          </Text>
        </Alert>
      )}
    </>
  );
}
