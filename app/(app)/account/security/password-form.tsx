"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { MIN_PASSWORD_LENGTH } from "@/lib/services/identity";
import { changePasswordAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../account.module.css";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialFormState);

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">
            Changed. Every other session signed in as you has ended — <strong>this
            one has not</strong>, so you stay where you are. Other devices will be
            asked to sign in again on their next request.
          </Text>
        </Alert>
      ) : null}

      <Field
        label="Your current password"
        error={errorFor(state, "current_password")}
        hint="A live session proves somebody who held the password once is here, not that you are."
        required
      >
        {(aria) => (
          <Input {...aria} name="current_password" type="password" autoComplete="current-password" />
        )}
      </Field>

      <Field
        label="New password"
        error={errorFor(state, "password")}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        required
      >
        {(aria) => <Input {...aria} name="password" type="password" autoComplete="new-password" />}
      </Field>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Changing" : "Change it"}
      </Button>
    </form>
  );
}
