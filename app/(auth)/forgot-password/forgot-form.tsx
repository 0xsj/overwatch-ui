"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/display";
import { Text } from "@/components/typography";
import { requestResetAction } from "../_actions";
import { initialFormState } from "../_form-state";
import { errorFor, FormError } from "../_components/form-error";
import s from "../_components/auth.module.css";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestResetAction, initialFormState);

  if (state.status === "ok") {
    return (
      <Alert tone="info" glyph="✉">
        <Text size="sm">
          <strong>Nothing was sent.</strong> A real build would say &ldquo;check your
          inbox&rdquo; here whether or not the address had an account, so that this page
          cannot be used to find out who has one.
        </Text>
        <Text size="sm" tone="tertiary">
          That is the behaviour worth keeping. This one has no mail to send.
        </Text>
      </Alert>
    );
  }

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      <Field
        label="Email"
        hint="We answer the same way whether or not the address has an account."
        error={errorFor(state, "email")}
        required
      >
        {(aria) => (
          <Input {...aria} name="email" type="email" autoComplete="username" placeholder="you@firm.example" />
        )}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Sending" : "Send a reset link"}
      </Button>
    </form>
  );
}
