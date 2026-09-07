"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { acceptInviteAction } from "./_actions";
import { initialFormState } from "../../(auth)/_form-state";
import { FormError } from "../../(auth)/_components/form-error";
import { signOutAction } from "../_actions";
import s from "./invite.module.css";

/** Not submitted on arrival, unlike `/verify` and `/email`.
 *
 *  Those two confirm something the person already chose — the click happened in
 *  their mail client. This one JOINS AN ORGANISATION under whichever account is
 *  currently signed in, and the account signed in on this machine may not be the
 *  one they meant. Doing that automatically is how somebody's personal session
 *  ends up in a client's firm. */
export function AcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, initialFormState);

  const wrongAddress =
    state.status === "error" && /different address/i.test(state.message);

  if (state.status === "ok") {
    return (
      <Alert tone="accent">
        <Text size="sm">
          Accepted. You are in that organisation now, and in your own — use the
          switcher in the bar above to move between them.
        </Text>
        <Link href="/home" className={s.link}>Open the application →</Link>
      </Alert>
    );
  }

  return (
    <form action={action} noValidate className={s.form}>
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />

      {wrongAddress ? (
        <Alert tone="warn">
          <Text size="sm">
            This invitation was sent to a different address. Sign out and sign in as
            the person it was meant for — the link will still work.
          </Text>
          <form action={signOutAction}>
            <Button type="submit" size="sm">Sign out</Button>
          </form>
        </Alert>
      ) : null}

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Accepting" : "Accept the invitation"}
      </Button>
    </form>
  );
}
