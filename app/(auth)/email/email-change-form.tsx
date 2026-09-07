"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { confirmEmailChangeAction } from "../_actions";
import { initialFormState } from "../_form-state";
import { FormError } from "../_components/form-error";
import s from "../_components/auth.module.css";

export function EmailChangeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmEmailChangeAction, initialFormState);
  const form = useRef<HTMLFormElement>(null);
  const fired = useRef(false);

  // Submitted on arrival: the click already happened, in a mail client.
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
          Open it again from the message. Nothing has changed in the meantime.
        </Text>
      </Alert>
    );
  }

  if (state.status === "ok") {
    return (
      <Alert tone="accent">
        <Text size="sm">
          Done. <strong>{state.account?.email}</strong> is your login now, and it is
          proven — a confirmed address is a proved address, so the account is
          active.
        </Text>
        <Link href="/sign-in" className={s.link}>Sign in with it →</Link>
      </Alert>
    );
  }

  return (
    <form ref={form} action={action} noValidate className={s.form}>
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />
      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Confirming" : "Confirm this address"}
      </Button>
    </form>
  );
}
