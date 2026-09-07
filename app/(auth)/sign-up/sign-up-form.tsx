"use client";

import { useActionState } from "react";
import { Alert } from "@/components/feedback";
import { Button, Field, Input } from "@/components/forms";
import { Text } from "@/components/typography";
import { MIN_PASSWORD_LENGTH } from "@/lib/services/identity";
import { registerAction } from "../_actions";
import { initialFormState } from "../_form-state";
import { errorFor, FormError } from "../_components/form-error";
import s from "../_components/auth.module.css";

export function SignUpForm() {
  const [state, action, pending] = useActionState(registerAction, initialFormState);

  if (state.status === "ok" && state.account) {
    return (
      <Alert tone="accent">
        <Text size="sm">
          <strong>{state.account.email}</strong> is registered, and the account is{" "}
          <strong>{state.account.status}</strong>.
        </Text>
        <Text size="sm" tone="tertiary">
          A pending account cannot sign in yet — the server refuses to authenticate one until
          something verifies the address, and nothing does that yet. This is the whole of what the
          endpoint promises today, said rather than dressed up as a finished sign-up.
        </Text>
      </Alert>
    );
  }

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      <Field label="Name" hint="The name that goes on the audit trail. Left blank, the server uses the part of your address before the @.">
        {(aria) => <Input {...aria} name="name" autoComplete="name" placeholder="S. Jarratt" />}
      </Field>

      <Field label="Email" error={errorFor(state, "email")} required>
        {(aria) => (
          <Input {...aria} name="email" type="email" autoComplete="username" placeholder="you@firm.example" />
        )}
      </Field>

      <Field
        label="Password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        error={errorFor(state, "password")}
        required
      >
        {(aria) => <Input {...aria} name="password" type="password" autoComplete="new-password" />}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Registering" : "Register"}
      </Button>
    </form>
  );
}
