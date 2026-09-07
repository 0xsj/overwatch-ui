"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { MIN_PASSWORD_LENGTH } from "@/lib/services/identity";
import { confirmResetAction } from "../_actions";
import { initialFormState } from "../_form-state";
import { errorFor, FormError } from "../_components/form-error";
import s from "../_components/auth.module.css";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmResetAction, initialFormState);

  if (!token) {
    return (
      <Alert tone="crit">
        <Text size="sm">This link carries no token.</Text>
        <Text size="sm" tone="tertiary">
          Open the link again from the message, or ask for a new one from the
          forgotten-password screen.
        </Text>
      </Alert>
    );
  }

  return (
    <form action={action} noValidate className={s.form}>
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />

      <Field
        label="New password"
        error={errorFor(state, "password")}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        required
      >
        {(aria) => (
          <Input {...aria} name="password" type="password" autoComplete="new-password" />
        )}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Setting" : "Set this password"}
      </Button>
    </form>
  );
}
