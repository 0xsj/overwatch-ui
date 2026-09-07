"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { signInAction } from "../_actions";
import { initialFormState } from "../_form-state";
import { errorFor, FormError } from "../_components/form-error";
import s from "../_components/auth.module.css";

export function SignInForm({ reset = false }: { reset?: boolean }) {
  const [state, action, pending] = useActionState(signInAction, initialFormState);

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {reset ? (
        <Alert tone="accent">
          <Text size="sm">
            Your password is changed, and every other session signed in as you has
            been ended. Sign in with the new one.
          </Text>
        </Alert>
      ) : null}

      <Field label="Email" error={errorFor(state, "email")} required>
        {(aria) => (
          <Input
            {...aria}
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@firm.example"
          />
        )}
      </Field>

      <Field label="Password" error={errorFor(state, "password")} required>
        {(aria) => (
          <Input {...aria} name="password" type="password" autoComplete="current-password" />
        )}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Checking" : "Sign in"}
      </Button>

      <div className={s.alt}>
        <Link href="/forgot-password" className={s.link}>Forgot your password?</Link>
      </div>
    </form>
  );
}
