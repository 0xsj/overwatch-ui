"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { requestEmailChangeAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../account.module.css";

/** Prove, then switch. The request answers 202 and changes NOTHING.
 *
 *  So this form must never render the new address as current: until the link in
 *  it is used, the old address is still the login, still where a reset goes, and
 *  still what `/v1/me` reports. Showing the new one early is how a typo becomes
 *  a permanent lockout — which is the exact failure the flow is shaped to
 *  avoid. */
export function EmailForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(requestEmailChangeAction, initialFormState);
  const waiting = state.status === "ok" ? state.pendingEmail : undefined;

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {waiting ? (
        <Alert tone="warn">
          <Text size="sm">
            <strong>Confirm at {waiting} to finish.</strong> Nothing has changed
            yet — <span className={s.mono}>{current}</span> is still your login and
            still where a reset goes.
          </Text>
          <Text size="xs" tone="tertiary">
            We also told the old address that this was asked for, so somebody who
            did not ask can act on it.
          </Text>
          {/* Said rather than hidden: there is no endpoint that reports a
              pending change, and `/v1/me` does not carry one, so this notice
              lives only in the reply to the request that started it. Reload and
              the screen genuinely does not know. */}
          <Text size="xs" tone="quiet">
            Reloading loses this notice. Nothing serves a pending change yet, so
            the screen has no way to remember it — the link in your inbox still
            works.
          </Text>
        </Alert>
      ) : null}

      <Field label="New email" error={errorFor(state, "email")} required>
        {(aria) => <Input {...aria} name="email" type="email" />}
      </Field>

      <Field
        label="Your current password"
        error={errorFor(state, "current_password")}
        hint="Changing where a reset goes is how a stolen session becomes permanent ownership, so this one asks."
        required
      >
        {(aria) => (
          <Input {...aria} name="current_password" type="password" autoComplete="current-password" />
        )}
      </Field>

      <Button type="submit" loading={pending}>
        {pending ? "Sending" : "Send a confirmation"}
      </Button>
    </form>
  );
}
