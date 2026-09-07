"use client";

import { useActionState } from "react";
import { Button } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { resendVerificationAction } from "../account/_actions";
import { initialFormState } from "../../(auth)/_form-state";
import s from "./verify-banner.module.css";

/** Hangs off `verified`, never off `status === "active"`.
 *
 *  A `pending` account signs in — `decisions/0018`, because gating the door on
 *  verification made a mistyped address a permanent lockout and let a stuck
 *  subscriber lock out somebody who had already verified. So the gate is on
 *  capability instead, and this is what tells you which capability you are
 *  missing before you go looking for the button.
 *
 *  The copy cannot say "sent". The endpoint answers 202 for an address that
 *  exists, one that does not and one that is not an address, so a conditional
 *  confirmation would be a claim the server never made. */
export function VerifyBanner({ email }: { email: string }) {
  const [state, action, pending] = useActionState(
    resendVerificationAction.bind(null, email),
    initialFormState,
  );

  return (
    <Alert tone="warn" live={false} className={s.banner}>
      <Text size="sm">
        <strong>Confirm your address.</strong> You can sign in and look around, and
        you cannot start an engagement until <span className={s.mono}>{email}</span>{" "}
        is proven — an unproven address must not end up on a client&rsquo;s record.
      </Text>
      {state.status === "ok" ? (
        <Text size="xs" tone="tertiary">
          If that address has an account, a link is on its way.
        </Text>
      ) : (
        <form action={action}>
          <Button type="submit" size="sm" loading={pending}>
            {pending ? "Sending" : "Send the link again"}
          </Button>
        </form>
      )}
    </Alert>
  );
}
