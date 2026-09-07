"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { confirmVerificationAction } from "../_actions";
import { initialFormState } from "../_form-state";
import { FormError } from "../_components/form-error";
import s from "../_components/auth.module.css";

export function VerifyForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmVerificationAction, initialFormState);
  const form = useRef<HTMLFormElement>(null);
  const fired = useRef(false);

  /* Submitted on arrival, because the person already clicked — the click was in
     their mail client. A screen with a "confirm" button here is asking somebody
     to confirm that they meant the thing they just did.

     Guarded by a ref rather than by state: this must fire once per mount, and a
     dependency array cannot express that on its own under Strict Mode's double
     invocation. */
  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    form.current?.requestSubmit();
  }, [token]);

  if (!token) {
    return (
      <Alert tone="crit">
        <Text size="sm">This link carries no token.</Text>
        <Text size="sm" tone="tertiary">
          Mail clients sometimes truncate a long URL. Open the link again from the
          message, or ask for a new one.
        </Text>
      </Alert>
    );
  }

  if (state.status === "ok") {
    return (
      <Alert tone="accent">
        <Text size="sm">
          Confirmed. <strong>{state.account?.email}</strong> is proven, and you can
          start an engagement now.
        </Text>
        <Link href="/home" className={s.link}>Open the application →</Link>
      </Alert>
    );
  }

  return (
    <form ref={form} action={action} noValidate className={s.form}>
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />

      {/* Visible only when the automatic submit did not land — a JavaScript
          failure, or a refusal the person can retry. */}
      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Confirming" : "Confirm this address"}
      </Button>
    </form>
  );
}
